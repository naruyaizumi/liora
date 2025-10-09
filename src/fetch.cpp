#include <napi.h>
#include <curl/curl.h>
#include <string>
#include <vector>
#include <map>
#include <memory>
#include <mutex>
#include <algorithm>
#include <sstream>
#include <cctype>
#include <atomic>
#include <chrono>
#include <random>

namespace {

static std::once_flag g_onceCurl;
static void ensureCurlGlobal() {
  std::call_once(g_onceCurl, [](){
    curl_global_init(CURL_GLOBAL_DEFAULT);
  });
}

template <typename T, void(*Deleter)(T*)>
struct Handle {
  T* p{nullptr};
  Handle() = default;
  explicit Handle(T* h): p(h) {}
  ~Handle(){ reset(); }
  void reset(T* np=nullptr){ if(p) Deleter(p); p=np; }
  T* get() const { return p; }
  T** put(){ reset(); return &p; }
  T* release(){ T* r=p; p=nullptr; return r; }
  explicit operator bool() const { return p!=nullptr; }
};

static void easy_cleanup(CURL* e) { if (e) curl_easy_cleanup(e); }
using Easy = Handle<CURL, easy_cleanup>;

struct SList {
  curl_slist* p{nullptr};
  ~SList(){ if (p) curl_slist_free_all(p); }
  void append(const char* s){
    curl_slist* np = curl_slist_append(p, s);
    if (!np) throw std::runtime_error("curl_slist_append failed");
    p = np;
  }
  curl_slist* get() const { return p; }
};

static CURLSH* g_share = nullptr;
static std::once_flag g_onceShare;

static void initShare() {
  std::call_once(g_onceShare, [](){
    g_share = curl_share_init();
    if (g_share) {
      curl_share_setopt(g_share, CURLSHOPT_SHARE, CURL_LOCK_DATA_DNS);
      curl_share_setopt(g_share, CURLSHOPT_SHARE, CURL_LOCK_DATA_COOKIE);
      curl_share_setopt(g_share, CURLSHOPT_SHARE, CURL_LOCK_DATA_SSL_SESSION);
    }
  });
}
static void cleanupShare() {
  if (g_share) {
    curl_share_cleanup(g_share);
    g_share = nullptr;
  }
}

static std::string lower(std::string s){
  std::transform(s.begin(), s.end(), s.begin(),
                 [](unsigned char c){ return std::tolower(c); });
  return s;
}
static inline std::string trim(const std::string& s) {
  size_t a = 0, b = s.size();
  while (a < b && std::isspace((unsigned char)s[a])) ++a;
  while (b > a && std::isspace((unsigned char)s[b-1])) --b;
  return s.substr(a, b-a);
}

struct ResponseData {
  std::vector<unsigned char> body;
  std::map<std::string, std::vector<std::string>> headers;
  long status = 0;
  std::string url;
  std::string statusText;

  void resetHop() { headers.clear(); }

  void addHeaderLine(const char* ptr, size_t len) {
    std::string line(ptr, len);
    while (!line.empty() && (line.back()=='\r' || line.back()=='\n')) line.pop_back();
    if (line.empty()) return;

    if (line.rfind("HTTP/", 0) == 0) {
      resetHop();
      std::istringstream iss(line);
      std::string proto; iss >> proto;
      iss >> status;
      std::string rest; std::getline(iss, rest);
      statusText = trim(rest);
      return;
    }

    auto pos = line.find(':');
    if (pos == std::string::npos) return;
    auto key = lower(trim(line.substr(0, pos)));
    auto val = trim(line.substr(pos+1));
    if (!key.empty()) headers[key].push_back(val);
  }
};

struct BodyHolder {
  std::vector<unsigned char> data;
  explicit BodyHolder(std::vector<unsigned char>&& v): data(std::move(v)) {}
};

static inline void vecAppend(std::vector<unsigned char>& dst, const std::string& s) {
  dst.insert(dst.end(), s.begin(), s.end());
}
static inline void vecAppendRaw(std::vector<unsigned char>& dst, const unsigned char* p, size_t n) {
  dst.insert(dst.end(), p, p + n);
}
static std::string randomBoundary() {
  auto now = std::chrono::high_resolution_clock::now().time_since_epoch().count();
  std::mt19937_64 rng((uint64_t)now ^ (uint64_t)std::random_device{}());
  std::uniform_int_distribution<uint64_t> dist;
  std::ostringstream oss;
  oss << "----LioraFormBoundary";
  for (int i=0;i<3;i++) oss << std::hex << dist(rng);
  return oss.str();
}

static void buildMultipartFromNapi(const Napi::Object& formObj,
                                   std::vector<unsigned char>& outBody,
                                   std::string& outBoundary) {
  outBoundary = randomBoundary();
  auto keys = formObj.GetPropertyNames();
  for (uint32_t i=0;i<keys.Length();++i) {
    std::string name = keys.Get(i).ToString().Utf8Value();
    Napi::Value v = formObj.Get(name);
    vecAppend(outBody, "--" + outBoundary + "\r\n");

    std::string filename;
    std::string contentType;
    const unsigned char* dataPtr = nullptr;
    size_t dataLen = 0;
    std::string textVal;

    auto flushDataPart = [&](bool isFile){
      std::ostringstream head;
      head << "Content-Disposition: form-data; name=\"" << name << "\"";
      if (isFile) {
        if (filename.empty()) filename = "blob";
        head << "; filename=\"" << filename << "\"\r\n";
        if (contentType.empty()) contentType = "application/octet-stream";
        head << "Content-Type: " << contentType << "\r\n\r\n";
        vecAppend(outBody, head.str());
        if (dataPtr && dataLen) vecAppendRaw(outBody, dataPtr, dataLen);
        vecAppend(outBody, "\r\n");
      } else {
        head << "\r\n\r\n";
        vecAppend(outBody, head.str());
        vecAppend(outBody, textVal);
        vecAppend(outBody, "\r\n");
      }
    };

    if (v.IsBuffer()) {
      auto b = v.As<Napi::Buffer<uint8_t>>();
      dataPtr = b.Data();
      dataLen = b.Length();
      flushDataPart(true);
    } else if (v.IsObject()) {
      Napi::Object o = v.As<Napi::Object>();
      if (o.Has("value") && o.Get("value").IsBuffer()) {
        auto b = o.Get("value").As<Napi::Buffer<uint8_t>>();
        dataPtr = b.Data(); dataLen = b.Length();
      } else if (o.Has("data") && o.Get("data").IsBuffer()) {
        auto b = o.Get("data").As<Napi::Buffer<uint8_t>>();
        dataPtr = b.Data(); dataLen = b.Length();
      } else if (o.Has("buffer") && o.Get("buffer").IsBuffer()) {
        auto b = o.Get("buffer").As<Napi::Buffer<uint8_t>>();
        dataPtr = b.Data(); dataLen = b.Length();
      } else if (o.Has("value")) {
        auto s = o.Get("value").ToString().Utf8Value();
        textVal = s;
      } else {
        textVal = o.ToString().Utf8Value();
      }
      if (o.Has("filename")) filename = o.Get("filename").ToString().Utf8Value();
      if (o.Has("contentType")) contentType = o.Get("contentType").ToString().Utf8Value();

      if (dataPtr && dataLen) flushDataPart(true);
      else flushDataPart(false);
    } else {
      textVal = v.ToString().Utf8Value();
      flushDataPart(false);
    }
  }
  vecAppend(outBody, "--" + outBoundary + "--\r\n");
}

class FetchWorker : public Napi::AsyncWorker {
public:
  FetchWorker(Napi::Env env, std::string url, Napi::Object opts, Napi::Promise::Deferred def)
  : Napi::AsyncWorker(env), deferred_(def), url_(std::move(url)) {
    method_         = getString(opts, "method", "GET");
    timeoutMs_      = getInt(opts, "timeout", 300000);
    maxRedirects_   = getInt(opts, "maxRedirects", 20);
    insecureTLS_    = getBool(opts, "insecure", false);
    decompress_     = getBool(opts, "decompress", true);
    ipResolve_      = getString(opts, "ipResolve", "auto"); // "v4"|"v6"|"auto"
    cookieFile_     = getString(opts, "cookieFile", "");
    cookieString_   = getString(opts, "cookie", "");
    maxBodySize_    = getInt64(opts, "maxBodySize", -1);

    if (opts.Has("headers") && opts.Get("headers").IsObject()) {
      Napi::Object h = opts.Get("headers").As<Napi::Object>();
      auto names = h.GetPropertyNames();
      for (uint32_t i=0;i<names.Length();++i) {
        auto k = names.Get(i).ToString().Utf8Value();
        auto v = h.Get(k).ToString().Utf8Value();
        if (!k.empty()) headersKVs_.push_back(k + ": " + v);
      }
      haveUserUA_      = h.Has("User-Agent") || h.Has("user-agent");
      haveAcceptEnc_   = h.Has("Accept-Encoding") || h.Has("accept-encoding");
      haveConn_        = h.Has("Connection") || h.Has("connection");
      haveExpect_      = h.Has("Expect") || h.Has("expect");
      haveContentType_ = h.Has("Content-Type") || h.Has("content-type");
    }

    if (opts.Has("body")) {
      auto v = opts.Get("body");
      if (v.IsBuffer()) {
        auto b = v.As<Napi::Buffer<uint8_t>>();
        body_.assign(b.Data(), b.Data() + b.Length());
      } else {
        auto s = v.ToString().Utf8Value();
        body_.assign(s.begin(), s.end());
      }
    }

    if (opts.Has("formData") && opts.Get("formData").IsObject()) {
      Napi::Object form = opts.Get("formData").As<Napi::Object>();
      multipartBoundary_.clear();
      multipartBody_.clear();
      buildMultipartFromNapi(form, multipartBody_, multipartBoundary_);
      useMultipart_ = true;
      body_.clear();
    }

    if (opts.Has("onData") && opts.Get("onData").IsFunction()) {
      tsfnData_ = Napi::ThreadSafeFunction::New(env,
        opts.Get("onData").As<Napi::Function>(), "fetch:onData", 0, 1);
      streaming_ = true;
    }
    if (opts.Has("onProgress") && opts.Get("onProgress").IsFunction()) {
      tsfnProg_ = Napi::ThreadSafeFunction::New(env,
        opts.Get("onProgress").As<Napi::Function>(), "fetch:onProgress", 0, 1);
      wantProgress_ = true;
    }

    abort_.store(false);
  }

  ~FetchWorker() override {
    if (tsfnData_) tsfnData_.Release();
    if (tsfnProg_) tsfnProg_.Release();
  }

  void Execute() override {
    ensureCurlGlobal();
    initShare();

    Easy easy(curl_easy_init());
    if (!easy) throw std::runtime_error("curl_easy_init failed");

    if (g_share) curl_easy_setopt(easy.get(), CURLOPT_SHARE, g_share);

    curl_easy_setopt(easy.get(), CURLOPT_URL, url_.c_str());

    curl_easy_setopt(easy.get(), CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_2TLS);
#ifdef CURLALPN_ENABLED
    curl_easy_setopt(easy.get(), CURLOPT_SSL_ENABLE_ALPN, 1L);
#endif

    if (ipResolve_ == "v4") curl_easy_setopt(easy.get(), CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
    else if (ipResolve_ == "v6") curl_easy_setopt(easy.get(), CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V6);
    else curl_easy_setopt(easy.get(), CURLOPT_IPRESOLVE, CURL_IPRESOLVE_WHATEVER);

    std::string methodUp = method_;
    std::transform(methodUp.begin(), methodUp.end(), methodUp.begin(), ::toupper);
    if      (methodUp == "GET")  curl_easy_setopt(easy.get(), CURLOPT_HTTPGET, 1L);
    else if (methodUp == "POST") curl_easy_setopt(easy.get(), CURLOPT_POST, 1L);
    else if (methodUp == "HEAD") curl_easy_setopt(easy.get(), CURLOPT_NOBODY, 1L);
    else                         curl_easy_setopt(easy.get(), CURLOPT_CUSTOMREQUEST, method_.c_str());

    SList hdrs;
    if (!haveUserUA_)    hdrs.append("User-Agent: undici/6 naruyaizumi");
    if (!haveAcceptEnc_ && decompress_) {
      curl_easy_setopt(easy.get(), CURLOPT_ACCEPT_ENCODING, "");
      hdrs.append("Accept-Encoding: br, gzip, deflate");
    }
    if (!haveConn_)      hdrs.append("Connection: keep-alive");
    if (!haveExpect_)    hdrs.append("Expect:");

    if (useMultipart_) {
      curl_easy_setopt(easy.get(), CURLOPT_POSTFIELDS, reinterpret_cast<char*>(multipartBody_.data()));
      curl_easy_setopt(easy.get(), CURLOPT_POSTFIELDSIZE, static_cast<long>(multipartBody_.size()));
      if (!haveContentType_) {
        std::string ct = "Content-Type: multipart/form-data; boundary=" + multipartBoundary_;
        hdrs.append(ct.c_str());
      }
    } else if (!body_.empty()) {
      curl_easy_setopt(easy.get(), CURLOPT_POSTFIELDS, reinterpret_cast<char*>(body_.data()));
      curl_easy_setopt(easy.get(), CURLOPT_POSTFIELDSIZE, static_cast<long>(body_.size()));
    }

    for (const auto& h : headersKVs_) hdrs.append(h.c_str());
    if (hdrs.get()) curl_easy_setopt(easy.get(), CURLOPT_HTTPHEADER, hdrs.get());

    if (!cookieFile_.empty()) {
      curl_easy_setopt(easy.get(), CURLOPT_COOKIEFILE, cookieFile_.c_str());
      curl_easy_setopt(easy.get(), CURLOPT_COOKIEJAR,  cookieFile_.c_str());
    }
    if (!cookieString_.empty()) {
      curl_easy_setopt(easy.get(), CURLOPT_COOKIE, cookieString_.c_str());
    }

    curl_easy_setopt(easy.get(), CURLOPT_SSL_VERIFYPEER, insecureTLS_ ? 0L : 1L);
    curl_easy_setopt(easy.get(), CURLOPT_SSL_VERIFYHOST, insecureTLS_ ? 0L : 2L);
#ifdef CURL_SSLVERSION_TLSv1_3
    curl_easy_setopt(easy.get(), CURLOPT_SSLVERSION, CURL_SSLVERSION_TLSv1_3);
#endif

    curl_easy_setopt(easy.get(), CURLOPT_FOLLOWLOCATION, 1L);
    curl_easy_setopt(easy.get(), CURLOPT_MAXREDIRS, static_cast<long>(maxRedirects_));
    curl_easy_setopt(easy.get(), CURLOPT_AUTOREFERER, 1L);
    curl_easy_setopt(easy.get(), CURLOPT_CONNECTTIMEOUT_MS, static_cast<long>(timeoutMs_));
    curl_easy_setopt(easy.get(), CURLOPT_TIMEOUT_MS,       static_cast<long>(timeoutMs_));
    curl_easy_setopt(easy.get(), CURLOPT_NOSIGNAL, 1L);
    curl_easy_setopt(easy.get(), CURLOPT_TCP_KEEPALIVE, 1L);
    curl_easy_setopt(easy.get(), CURLOPT_TCP_KEEPIDLE, 30L);
    curl_easy_setopt(easy.get(), CURLOPT_TCP_KEEPINTVL, 15L);
#ifdef CURLOPT_TCP_NODELAY
    curl_easy_setopt(easy.get(), CURLOPT_TCP_NODELAY, 1L);
#endif
#ifdef CURLOPT_BUFFERSIZE
    curl_easy_setopt(easy.get(), CURLOPT_BUFFERSIZE, 256 * 1024L);
#endif
    curl_easy_setopt(easy.get(), CURLOPT_DNS_CACHE_TIMEOUT, 120L);

    curl_easy_setopt(easy.get(), CURLOPT_WRITEDATA, this);
    curl_easy_setopt(easy.get(), CURLOPT_WRITEFUNCTION, &FetchWorker::writeBodyTramp);

    curl_easy_setopt(easy.get(), CURLOPT_HEADERDATA, this);
    curl_easy_setopt(easy.get(), CURLOPT_HEADERFUNCTION, &FetchWorker::writeHeaderTramp);

    curl_easy_setopt(easy.get(), CURLOPT_XFERINFODATA, this);
    curl_easy_setopt(easy.get(), CURLOPT_XFERINFOFUNCTION, &FetchWorker::xferinfoTramp);
    curl_easy_setopt(easy.get(), CURLOPT_NOPROGRESS, wantProgress_ ? 0L : 1L);

    CURLcode rc = curl_easy_perform(easy.get());
    if (abort_.load()) throw std::runtime_error("request aborted");
    if (rc != CURLE_OK) {
      throw std::runtime_error(std::string("curl perform error: ") + curl_easy_strerror(rc));
    }

    long httpStatus = 0;
    curl_easy_getinfo(easy.get(), CURLINFO_RESPONSE_CODE, &httpStatus);
    resp_.status = httpStatus;

    char* eff = nullptr;
    if (curl_easy_getinfo(easy.get(), CURLINFO_EFFECTIVE_URL, &eff) == CURLE_OK && eff) {
      resp_.url.assign(eff);
    }

    if (resp_.statusText.empty()) {
      switch (resp_.status) {
        case 200: resp_.statusText = "OK"; break;
        case 201: resp_.statusText = "Created"; break;
        case 204: resp_.statusText = "No Content"; break;
        case 301: resp_.statusText = "Moved Permanently"; break;
        case 302: resp_.statusText = "Found"; break;
        case 400: resp_.statusText = "Bad Request"; break;
        case 401: resp_.statusText = "Unauthorized"; break;
        case 403: resp_.statusText = "Forbidden"; break;
        case 404: resp_.statusText = "Not Found"; break;
        case 500: resp_.statusText = "Internal Server Error"; break;
        default:  resp_.statusText = ""; break;
      }
    }
  }

  void OnOK() override {
    Napi::Env env = Env();

    Napi::Object res = Napi::Object::New(env);
    res.Set("status", Napi::Number::New(env, resp_.status));
    res.Set("statusText", Napi::String::New(env, resp_.statusText));
    res.Set("url", Napi::String::New(env, resp_.url));
    res.Set("ok", Napi::Boolean::New(env, resp_.status >= 200 && resp_.status < 300));

    Napi::Object h = Napi::Object::New(env);
    Napi::Object first = Napi::Object::New(env);
    for (auto& kv : resp_.headers) {
      Napi::Array arr = Napi::Array::New(env, kv.second.size());
      for (size_t i=0;i<kv.second.size();++i)
        arr.Set((uint32_t)i, Napi::String::New(env, kv.second[i]));
      h.Set(kv.first, arr);
      if (!kv.second.empty())
        first.Set(kv.first, Napi::String::New(env, kv.second.front()));
    }
    h.Set("__first", first);
    h.Set("get", Napi::Function::New(env, [](const Napi::CallbackInfo& info)->Napi::Value{
      Napi::Env e = info.Env();
      if (info.Length() < 1) return e.Undefined();
      std::string key = info[0].ToString().Utf8Value();
      std::transform(key.begin(), key.end(), key.begin(), [](unsigned char c){ return std::tolower(c); });
      Napi::Object self = info.This().As<Napi::Object>();
      Napi::Value vf = self.Get("__first");
      if (!vf.IsObject()) return e.Undefined();
      Napi::Value v = vf.As<Napi::Object>().Get(key);
      if (v.IsUndefined()) return e.Undefined();
      return v;
    }));
    h.Set("forEach", Napi::Function::New(env, [](const Napi::CallbackInfo& info)->Napi::Value{
      Napi::Env e = info.Env();
      if (info.Length() < 1 || !info[0].IsFunction()) {
        return e.Undefined();
      }
      Napi::Function callback = info[0].As<Napi::Function>();
      Napi::Object self = info.This().As<Napi::Object>();
      Napi::Value vf = self.Get("__first");
      if (!vf.IsObject()) return e.Undefined();
      Napi::Object firstObj = vf.As<Napi::Object>();
      Napi::Array keys = firstObj.GetPropertyNames();
      for (uint32_t i = 0; i < keys.Length(); ++i) {
        Napi::Value keyVal = keys.Get(i);
        std::string key = keyVal.ToString().Utf8Value();
        Napi::Value value = firstObj.Get(key);
        callback.Call({ value, keyVal, self });
      }
      return e.Undefined();
    }));
    h.Set("entries", Napi::Function::New(env, [](const Napi::CallbackInfo& info)->Napi::Value{
      Napi::Env e = info.Env();
      Napi::Object self = info.This().As<Napi::Object>();
      Napi::Value vf = self.Get("__first");
      if (!vf.IsObject()) return Napi::Array::New(e, 0);
      Napi::Object firstObj = vf.As<Napi::Object>();
      Napi::Array keys = firstObj.GetPropertyNames();
      Napi::Array result = Napi::Array::New(e);
      for (uint32_t i = 0; i < keys.Length(); ++i) {
        Napi::Value keyVal = keys.Get(i);
        Napi::Value value = firstObj.Get(keyVal.ToString());
        Napi::Array entry = Napi::Array::New(e, 2);
        entry.Set((uint32_t)0, keyVal);
        entry.Set((uint32_t)1, value);
        result.Set(i, entry);
      }
      return result;
    }));
    
    res.Set("headers", h);

    auto* holder = new BodyHolder(std::move(resp_.body));
    auto ext = Napi::External<BodyHolder>::New(env, holder, [](Napi::Env, BodyHolder* p){ delete p; });
    res.Set("_body", ext);

    res.Set("body", Napi::Buffer<unsigned char>::Copy(env, holder->data.data(), holder->data.size()));

    res.Set("text", Napi::Function::New(env, [](const Napi::CallbackInfo& info){
      Napi::Env e = info.Env();
      auto ext = info.This().As<Napi::Object>().Get("_body");
      if (!ext.IsExternal()) return Napi::String::New(e, "");
      auto* bh = ext.As<Napi::External<BodyHolder>>().Data();
      std::string s(bh->data.begin(), bh->data.end());
      return Napi::String::New(e, s);
    }));

    res.Set("arrayBuffer", Napi::Function::New(env, [](const Napi::CallbackInfo& info){
      Napi::Env e = info.Env();
      auto ext = info.This().As<Napi::Object>().Get("_body");
      if (!ext.IsExternal()) return Napi::Buffer<unsigned char>::Copy(e, nullptr, 0);
      auto* bh = ext.As<Napi::External<BodyHolder>>().Data();
      return Napi::Buffer<unsigned char>::Copy(e, bh->data.data(), bh->data.size());
    }));

    res.Set("json", Napi::Function::New(env, [](const Napi::CallbackInfo& info){
      Napi::Env e = info.Env();
      auto ext = info.This().As<Napi::Object>().Get("_body");
      if (!ext.IsExternal()) {
        Napi::TypeError::New(e, "body unavailable").ThrowAsJavaScriptException();
        return e.Undefined();
      }
      auto* bh = ext.As<Napi::External<BodyHolder>>().Data();
      std::string s(bh->data.begin(), bh->data.end());
      auto global = e.Global();
      auto JSON = global.Get("JSON").As<Napi::Object>();
      auto parse = JSON.Get("parse").As<Napi::Function>();
      return parse.Call(JSON, { Napi::String::New(e, s) });
    }));

    deferred_.Resolve(res);
  }

  void OnError(const Napi::Error& e) override {
    deferred_.Reject(e.Value());
  }

  Napi::Function makeAbort(Napi::Env env) {
    return Napi::Function::New(env, [this](const Napi::CallbackInfo& info){
      (void)info;
      abort_.store(true);
      return info.Env().Undefined();
    });
  }

private:
  static size_t writeBodyTramp(char* ptr, size_t size, size_t nmemb, void* userdata) {
    return static_cast<FetchWorker*>(userdata)->writeBody(ptr, size, nmemb);
  }
  static size_t writeHeaderTramp(char* buffer, size_t size, size_t nitems, void* userdata) {
    return static_cast<FetchWorker*>(userdata)->writeHeader(buffer, size, nitems);
  }
  static int xferinfoTramp(void* clientp, curl_off_t dltotal, curl_off_t dlnow,
                           curl_off_t ultotal, curl_off_t ulnow) {
    return static_cast<FetchWorker*>(clientp)->onProgress(dltotal, dlnow, ultotal, ulnow);
  }

  size_t writeBody(char* ptr, size_t size, size_t nmemb) {
    if (abort_.load()) return 0;
    size_t n = size * nmemb;

    if (streaming_ && tsfnData_) {
      auto* chunk = new std::vector<unsigned char>(
        reinterpret_cast<unsigned char*>(ptr),
        reinterpret_cast<unsigned char*>(ptr) + n
      );
      try {
        tsfnData_.BlockingCall(chunk, [](Napi::Env env, Napi::Function cb, std::vector<unsigned char>* data){
          auto buf = Napi::Buffer<unsigned char>::Copy(env, data->data(), data->size());
          cb.Call({ buf });
          delete data;
        });
      } catch (...) { return 0; }
      downloaded_ += n;
      return n;
    }

    if (maxBodySize_ >= 0 && static_cast<long long>(resp_.body.size() + n) > maxBodySize_) {
      return 0;
    }
    try {
      auto begin = reinterpret_cast<unsigned char*>(ptr);
      resp_.body.insert(resp_.body.end(), begin, begin + n);
      downloaded_ += n;
    } catch (...) { return 0; }
    return n;
  }

  size_t writeHeader(char* buffer, size_t size, size_t nitems) {
    size_t n = size * nitems;
    resp_.addHeaderLine(buffer, n);
    return n;
  }

  int onProgress(curl_off_t dltotal, curl_off_t dlnow, curl_off_t ultotal, curl_off_t ulnow) {
    if (abort_.load()) return 1;
    if (wantProgress_ && tsfnProg_) {
      struct Agg { double dn, dt, un, ut; };
      auto* agg = new Agg{ (double)dlnow, (double)dltotal, (double)ulnow, (double)ultotal };
      try {
        tsfnProg_.NonBlockingCall(agg, [](Napi::Env env, Napi::Function cb, Agg* a){
          Napi::Object o = Napi::Object::New(env);
          o.Set("downloaded", Napi::Number::New(env, a->dn));
          o.Set("total",      Napi::Number::New(env, a->dt));
          o.Set("uploaded",   Napi::Number::New(env, a->un));
          o.Set("utotal",     Napi::Number::New(env, a->ut));
          cb.Call({ o });
          delete a;
        });
      } catch (...) {}
    }
    return 0;
  }

  static std::string getString(const Napi::Object& o, const char* k, const char* def) {
    if (o.Has(k)) return o.Get(k).ToString().Utf8Value();
    return def;
  }
  static int getInt(const Napi::Object& o, const char* k, int def) {
    if (o.Has(k)) return o.Get(k).ToNumber().Int32Value();
    return def;
  }
  static long long getInt64(const Napi::Object& o, const char* k, long long def) {
    if (o.Has(k)) return (long long)o.Get(k).ToNumber().Int64Value();
    return def;
  }
  static bool getBool(const Napi::Object& o, const char* k, bool def) {
    if (o.Has(k)) return o.Get(k).ToBoolean().Value();
    return def;
  }

private:
  Napi::Promise::Deferred deferred_;
  std::string url_;

  std::string method_;
  int         timeoutMs_;
  int         maxRedirects_;
  bool        insecureTLS_;
  bool        decompress_;
  std::string ipResolve_;
  std::string cookieFile_;
  std::string cookieString_;
  long long   maxBodySize_{-1};

  bool haveUserUA_ = false, haveAcceptEnc_ = false, haveConn_ = false, haveExpect_ = false, haveContentType_ = false;

  bool streaming_ = false;
  bool wantProgress_ = false;

  std::vector<std::string> headersKVs_;
  std::vector<unsigned char> body_;

  bool useMultipart_ = false;
  std::vector<unsigned char> multipartBody_;
  std::string multipartBoundary_;

  ResponseData resp_;
  std::atomic<bool> abort_{false};
  size_t downloaded_ = 0;

  Napi::ThreadSafeFunction tsfnData_;
  Napi::ThreadSafeFunction tsfnProg_;
};

Napi::Value StartFetch(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "startFetch(url, [options]) requires url string").ThrowAsJavaScriptException();
    return env.Null();
  }

  ensureCurlGlobal();
  static std::once_flag onceCleanup;
  std::call_once(onceCleanup, [&](){
    env.AddCleanupHook([](){
      cleanupShare();
      curl_global_cleanup();
    });
  });

  std::string url = info[0].As<Napi::String>().Utf8Value();
  Napi::Object opts = (info.Length() >= 2 && info[1].IsObject())
                        ? info[1].As<Napi::Object>()
                        : Napi::Object::New(env);

  auto deferred = Napi::Promise::Deferred::New(env);
  auto* worker = new FetchWorker(env, std::move(url), opts, deferred);
  Napi::Function abortFn = worker->makeAbort(env);
  worker->Queue();

  Napi::Object ret = Napi::Object::New(env);
  ret.Set("promise", deferred.Promise());
  ret.Set("abort", abortFn);
  return ret;
}

Napi::Value Fetch(const Napi::CallbackInfo& info) {
  Napi::Object o = StartFetch(info).As<Napi::Object>();
  return o.Get("promise");
}

} // jawa jawa jawa

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  ensureCurlGlobal();
  env.AddCleanupHook([](){
    cleanupShare();
    curl_global_cleanup();
  });
  exports.Set("startFetch", Napi::Function::New(env, StartFetch));
  exports.Set("fetch",      Napi::Function::New(env, Fetch));
  return exports;
}

NODE_API_MODULE(fetch, InitAll)