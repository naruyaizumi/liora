#include "../core/sticker_core.h"
#include "../thread_pool.h"
#include <napi.h>

class StickerAsyncWorker : public Napi::AsyncWorker {
public:
  StickerAsyncWorker(Napi::Env &env, std::vector<uint8_t> &&input,
                     StickerCore::StickerOptions &&opts)
      : Napi::AsyncWorker(env), deferred_(Napi::Promise::Deferred::New(env)),
        input_(std::move(input)), options_(std::move(opts)) {}

  Napi::Promise GetPromise() { return deferred_.Promise(); }

protected:
  void Execute() override {
    result_ =
        StickerCore::ProcessSticker(input_.data(), input_.size(), options_);
  }

  void OnOK() override {
    Napi::HandleScope scope(Env());

    if (result_.success) {
      auto buffer = Napi::Buffer<uint8_t>::Copy(Env(), result_.data.data(),
                                                result_.data.size());
      deferred_.Resolve(buffer);
    } else {
      deferred_.Reject(Napi::Error::New(Env(), result_.error).Value());
    }
  }

  void OnError(const Napi::Error &error) override {
    Napi::HandleScope scope(Env());
    deferred_.Reject(error.Value());
  }

private:
  Napi::Promise::Deferred deferred_;
  std::vector<uint8_t> input_;
  StickerCore::StickerOptions options_;
  StickerCore::StickerResult result_;
};

struct TSFNData {
  Napi::Promise::Deferred *deferred;
  StickerCore::StickerResult result;
};

class StickerThreadPoolWorker {
public:
  static Napi::Promise Execute(Napi::Env env, std::vector<uint8_t> &&input,
                               StickerCore::StickerOptions &&opts) {
    auto *deferred =
        new Napi::Promise::Deferred(Napi::Promise::Deferred::New(env));
    auto promise = deferred->Promise();

    Napi::Function callback =
        Napi::Function::New(env, [](const Napi::CallbackInfo &) {});

    auto tsfn =
        Napi::ThreadSafeFunction::New(env, callback, "StickerCallback", 0, 1);

    get_sticker_pool().enqueue([input = std::move(input),
                                opts = std::move(opts), tsfn,
                                deferred]() mutable {
      auto result =
          StickerCore::ProcessSticker(input.data(), input.size(), opts);

      auto *data = new TSFNData{deferred, std::move(result)};

      napi_status status = tsfn.BlockingCall(
          data, [](Napi::Env env, Napi::Function, TSFNData *data) {
            Napi::HandleScope scope(env);

            if (data->result.success) {
              auto buffer = Napi::Buffer<uint8_t>::Copy(
                  env, data->result.data.data(), data->result.data.size());
              data->deferred->Resolve(buffer);
            } else {
              data->deferred->Reject(
                  Napi::Error::New(env, data->result.error).Value());
            }

            delete data->deferred;
            delete data;
          });

      if (status != napi_ok) {
        delete data->deferred;
        delete data;
      }

      tsfn.Release();
    });

    return promise;
  }
};

static Napi::Value StickerAsync(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsBuffer()) {
    auto deferred = Napi::Promise::Deferred::New(env);
    deferred.Reject(
        Napi::Error::New(env, "First argument must be a Buffer").Value());
    return deferred.Promise();
  }

  auto buffer = info[0].As<Napi::Buffer<uint8_t>>();
  Napi::Object opt = (info.Length() >= 2 && info[1].IsObject())
                         ? info[1].As<Napi::Object>()
                         : Napi::Object::New(env);

  StickerCore::StickerOptions options;
  options.crop = opt.Has("crop") ? opt.Get("crop").ToBoolean() : false;
  options.quality =
      opt.Has("quality") ? opt.Get("quality").ToNumber().Int32Value() : 80;
  options.fps = opt.Has("fps") ? opt.Get("fps").ToNumber().Int32Value() : 15;
  options.maxDuration = opt.Has("maxDuration")
                            ? opt.Get("maxDuration").ToNumber().Int32Value()
                            : 15;
  options.packName =
      opt.Has("packName") ? opt.Get("packName").ToString().Utf8Value() : "";
  options.authorName =
      opt.Has("authorName") ? opt.Get("authorName").ToString().Utf8Value() : "";

  if (opt.Has("emojis") && opt.Get("emojis").IsArray()) {
    Napi::Array arr = opt.Get("emojis").As<Napi::Array>();
    for (uint32_t i = 0; i < arr.Length(); ++i) {
      if (arr.Get(i).IsString()) {
        options.emojis.push_back(arr.Get(i).ToString().Utf8Value());
      }
    }
  }

  std::vector<uint8_t> input(buffer.Data(), buffer.Data() + buffer.Length());

  auto *worker =
      new StickerAsyncWorker(env, std::move(input), std::move(options));
  auto promise = worker->GetPromise();
  worker->Queue();

  return promise;
}

static Napi::Value StickerThreadPool(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsBuffer()) {
    auto deferred = Napi::Promise::Deferred::New(env);
    deferred.Reject(
        Napi::Error::New(env, "First argument must be a Buffer").Value());
    return deferred.Promise();
  }

  auto buffer = info[0].As<Napi::Buffer<uint8_t>>();
  Napi::Object opt = (info.Length() >= 2 && info[1].IsObject())
                         ? info[1].As<Napi::Object>()
                         : Napi::Object::New(env);

  StickerCore::StickerOptions options;
  options.crop = opt.Has("crop") ? opt.Get("crop").ToBoolean() : false;
  options.quality =
      opt.Has("quality") ? opt.Get("quality").ToNumber().Int32Value() : 80;
  options.fps = opt.Has("fps") ? opt.Get("fps").ToNumber().Int32Value() : 15;
  options.maxDuration = opt.Has("maxDuration")
                            ? opt.Get("maxDuration").ToNumber().Int32Value()
                            : 15;
  options.packName =
      opt.Has("packName") ? opt.Get("packName").ToString().Utf8Value() : "";
  options.authorName =
      opt.Has("authorName") ? opt.Get("authorName").ToString().Utf8Value() : "";

  if (opt.Has("emojis") && opt.Get("emojis").IsArray()) {
    Napi::Array arr = opt.Get("emojis").As<Napi::Array>();
    for (uint32_t i = 0; i < arr.Length(); ++i) {
      if (arr.Get(i).IsString()) {
        options.emojis.push_back(arr.Get(i).ToString().Utf8Value());
      }
    }
  }

  std::vector<uint8_t> input(buffer.Data(), buffer.Data() + buffer.Length());

  return StickerThreadPoolWorker::Execute(env, std::move(input),
                                          std::move(options));
}

static Napi::Value GetPoolInfo(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  Napi::Object obj = Napi::Object::New(env);

  auto &pool = get_sticker_pool();
  obj.Set("threads", Napi::Number::New(env, pool.thread_count()));
  obj.Set("queueSize", Napi::Number::New(env, pool.queue_size()));
  obj.Set("activeThreads", Napi::Number::New(env, pool.active_count()));
  obj.Set("isRunning", Napi::Boolean::New(env, pool.is_running()));

  return obj;
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("stickerAsync", Napi::Function::New(env, StickerAsync));
  exports.Set("stickerThreadPool", Napi::Function::New(env, StickerThreadPool));
  exports.Set("getPoolInfo", Napi::Function::New(env, GetPoolInfo));
  return exports;
}

NODE_API_MODULE(sticker_async, Init)