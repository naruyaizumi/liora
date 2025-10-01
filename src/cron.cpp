#include <napi.h>
#include <thread>
#include <atomic>
#include <vector>
#include <string>
#include <chrono>
#include <mutex>
#include <condition_variable>
#include <sstream>
#include <set>
#include <deque>
#include <cstdlib>
#include <ctime>
#include <algorithm>

using clock_sys    = std::chrono::system_clock;
using clock_steady = std::chrono::steady_clock;

class Job;
static std::mutex g_jobs_mu;
static std::vector<Job*> g_jobs;
static void GlobalCleanup(void*);

static std::tm to_local_tm(std::time_t t) {
  std::tm out{};
#if defined(_WIN32)
  localtime_s(&out, &t);
#else
  localtime_r(&t, &out);
#endif
  return out;
}
static std::time_t from_local_tm(std::tm tm) {
#if defined(_WIN32)
  return _mkgmtime(&tm) + _timezone;
#else
  return std::mktime(&tm);
#endif
}

struct CronField {
  std::set<int> vals;
  bool any = false;
};

static bool parse_part(const std::string& s, int lo, int hi, CronField& out) {
  if (s == "*") { out.any = true; return true; }
  std::stringstream ss(s);
  std::string token;
  while (std::getline(ss, token, ',')) {
    int step = 1;
    std::string main = token;
    auto slash = token.find('/');
    if (slash != std::string::npos) {
      main = token.substr(0, slash);
      try { step = std::stoi(token.substr(slash + 1)); }
      catch (...) { return false; }
      if (step <= 0) return false;
    }
    int start, end;
    auto dash = main.find('-');
    try {
      if (main == "*") { start = lo; end = hi; }
      else if (dash == std::string::npos) { start = end = std::stoi(main); }
      else { start = std::stoi(main.substr(0, dash));
             end   = std::stoi(main.substr(dash + 1)); }
    } catch (...) { return false; }
    if (start < lo || end > hi || start > end) return false;
    for (int v = start; v <= end; v += step) out.vals.insert(v);
  }
  return true;
}

struct CronExpr { CronField min, hour, dom, mon, dow; };

static bool parse_cron5(const std::string& expr, CronExpr& out, std::string& err) {
  std::stringstream ss(expr);
  std::string f[5];
  for (int i = 0; i < 5; i++) if (!(ss >> f[i])) { err = "need 5 fields"; return false; }
  if (!parse_part(f[0], 0, 59, out.min)) { err = "minute invalid"; return false; }
  if (!parse_part(f[1], 0, 23, out.hour)) { err = "hour invalid"; return false; }
  if (!parse_part(f[2], 1, 31, out.dom))  { err = "dom invalid"; return false; }
  if (!parse_part(f[3], 1, 12, out.mon))  { err = "month invalid"; return false; }
  if (!parse_part(f[4], 0, 6,  out.dow))  { err = "dow invalid (0=Sun)"; return false; }
  return true;
}

static inline bool match_field(const CronField& f, int v) { return f.any || f.vals.count(v); }

static std::time_t next_fire_time(const CronExpr& c, std::time_t now) {
  for (int dayOffset = 0; dayOffset <= 366; ++dayOffset) {
    std::time_t base = now + dayOffset * 24 * 3600;
    std::tm tm = to_local_tm(base);
    int mon  = tm.tm_mon + 1;
    int mday = tm.tm_mday;
    int dow  = (tm.tm_wday + 7) % 7;
    if (!match_field(c.mon, mon))  continue;
    if (!match_field(c.dom, mday)) continue;
    if (!match_field(c.dow, dow))  continue;

    for (int h = 0; h < 24; ++h) {
      if (!match_field(c.hour, h)) continue;
      for (int m = 0; m < 60; ++m) {
        if (!match_field(c.min, m)) continue;
        std::tm cand = tm;
        cand.tm_hour = h; cand.tm_min = m; cand.tm_sec = 0;
        std::time_t cand_t = from_local_tm(cand);
        if (cand_t > now) return cand_t;
      }
    }
  }
  return now + 3600;
}

enum class Concurrency { SKIP, QUEUE, PARALLEL };

class Job {
public:
  Job(Napi::Env env,
      std::string name,
      std::string cronExpr,
      Napi::Function cb,
      std::string /*tz_unused*/,
      Concurrency mode,
      size_t maxQueue,
      int intervalSec)
    : name_(std::move(name)),
      mode_(mode),
      maxQueue_(maxQueue),
      intervalSec_(intervalSec),
      tsfn_(Napi::ThreadSafeFunction::New(
        env, cb, "cron_cb:" + name_, 0 /*unbounded queue*/, 1 /*threads*/)),
      running_(true),
      active_(0) {

    if (intervalSec_ > 0) {
      isInterval_ = true;
    } else {
      std::string err;
      if (!parse_cron5(cronExpr, cron_, err)) {
        throw Napi::Error::New(env, "Invalid cron: " + err);
      }
    }

    worker_ = std::thread([this](){ loop(); });
  }

  ~Job() { stop(); }

  void stop() {
    bool expected = true;
    if (running_.compare_exchange_strong(expected, false)) {
      { std::lock_guard<std::mutex> lk(mu_); queue_.clear(); }
      cv_.notify_all();
      if (worker_.joinable()) worker_.join();
      if (!tsfnReleased_.exchange(true)) tsfn_.Release();
    }
  }

  bool isRunning() const { return running_.load(); }

  int secondsToNext() const {
    std::time_t now  = std::time(nullptr);
    std::time_t next = isInterval_ ? now + intervalSec_ : next_fire_time(cron_, now);
    long diff = static_cast<long>(next - now);
    return diff < 0 ? 0 : static_cast<int>(diff);
  }

private:
  void loop() {
    while (running_) {
      std::time_t now_sys  = std::time(nullptr);
      std::time_t next_sys = isInterval_ ? (now_sys + intervalSec_)
                                         : next_fire_time(cron_, now_sys);

      auto steady_target = clock_steady::now()
                         + std::chrono::seconds(next_sys > now_sys ? (next_sys - now_sys) : 0);

      std::unique_lock<std::mutex> lk(mu_);
      if (cv_.wait_until(lk, steady_target, [&]{ return !running_; })) break;
      lk.unlock();
      if (!running_) break;

      switch (mode_) {
        case Concurrency::SKIP:
          if (active_.load() == 0) launchTask();
          break;
        case Concurrency::QUEUE: {
          std::lock_guard<std::mutex> ql(qmu_);
          if (queue_.size() >= maxQueue_) queue_.pop_front();
          queue_.push_back(1);
          if (active_.load() == 0) pumpQueue();
          break;
        }
        case Concurrency::PARALLEL:
          launchTask();
          break;
      }
    }

    if (mode_ == Concurrency::QUEUE) {
      for (;;) {
        bool has; { std::lock_guard<std::mutex> ql(qmu_); has = !queue_.empty(); }
        if (!has) break;
        pumpQueue();
      }
    }
  }

  void pumpQueue() {
    {
      std::lock_guard<std::mutex> ql(qmu_);
      if (queue_.empty()) return;
      queue_.pop_front();
    }
    launchTask();
  }

  void launchTask() {
    active_.fetch_add(1);
    tsfn_.BlockingCall([](Napi::Env env, Napi::Function cb){
      try { cb.Call({}); } catch (...) { /* swallow */ }
    });
    active_.fetch_sub(1);

    if (mode_ == Concurrency::QUEUE) {
      bool hasMore; { std::lock_guard<std::mutex> ql(qmu_); hasMore = !queue_.empty(); }
      if (hasMore) pumpQueue();
    }
  }

private:
  std::string name_;
  CronExpr cron_;
  bool isInterval_ = false;
  Concurrency mode_;
  size_t maxQueue_;
  int intervalSec_;

  std::thread worker_;
  std::atomic<bool> running_;
  std::atomic<bool> tsfnReleased_{false};
  std::mutex mu_;
  std::condition_variable cv_;

  std::atomic<int> active_;
  std::deque<int> queue_;
  std::mutex qmu_;

  Napi::ThreadSafeFunction tsfn_;
};

static void GlobalCleanup(void*) {
  std::vector<Job*> jobsCopy;
  { std::lock_guard<std::mutex> lk(g_jobs_mu); jobsCopy.swap(g_jobs); }
  for (auto* j : jobsCopy) { if (j) { j->stop(); delete j; } }
}

static Napi::Value Schedule(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 2 || !info[0].IsString() || !info[1].IsFunction()) {
    Napi::TypeError::New(env, "schedule(cronOrName, callback, [options])").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  std::string cronOrName = info[0].As<Napi::String>();
  Napi::Function cb      = info[1].As<Napi::Function>();
  Napi::Object opts      = (info.Length() >= 3 && info[2].IsObject())
                           ? info[2].As<Napi::Object>() : Napi::Object::New(env);

  std::string name  = opts.Has("name")        ? (std::string)opts.Get("name").As<Napi::String>() : cronOrName;
  std::string cron  = opts.Has("cron")        ? (std::string)opts.Get("cron").As<Napi::String>() : cronOrName;
  std::string tz    = opts.Has("timezone")    ? (std::string)opts.Get("timezone").As<Napi::String>() : "";
  std::string conc  = opts.Has("concurrency") ? (std::string)opts.Get("concurrency").As<Napi::String>() : "skip";
  int    intervalSec = opts.Has("intervalSeconds") ? (int)opts.Get("intervalSeconds").As<Napi::Number>().Int32Value() : 0;
  size_t maxQueue    = opts.Has("maxQueue") ? (size_t)opts.Get("maxQueue").As<Napi::Number>().Int64Value() : 10;

  Concurrency mode = Concurrency::SKIP;
  if (conc == "queue")    mode = Concurrency::QUEUE;
  else if (conc == "parallel") mode = Concurrency::PARALLEL;

  Job* job = nullptr;
  try {
    job = new Job(env, name, cron, cb, tz, mode, maxQueue, intervalSec);
  } catch (const Napi::Error& e) {
    e.ThrowAsJavaScriptException();
    return env.Undefined();
  } catch (const std::exception& ex) {
    Napi::Error::New(env, ex.what()).ThrowAsJavaScriptException();
    return env.Undefined();
  } catch (...) {
    Napi::Error::New(env, "Unknown error in schedule").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  {
    std::lock_guard<std::mutex> lk(g_jobs_mu);
    if (g_jobs.empty()) {
      env.AddCleanupHook(GlobalCleanup, (void*)nullptr);
    }
    g_jobs.push_back(job);
  }

  Napi::Object handle = Napi::Object::New(env);
  handle.Set("stop", Napi::Function::New(env, [job](const Napi::CallbackInfo& info){
    job->stop();
    return info.Env().Undefined();
  }));
  handle.Set("isRunning", Napi::Function::New(env, [job](const Napi::CallbackInfo& info){
    return Napi::Boolean::New(info.Env(), job->isRunning());
  }));
  handle.Set("secondsToNext", Napi::Function::New(env, [job](const Napi::CallbackInfo& info){
    return Napi::Number::New(info.Env(), job->secondsToNext());
  }));

  auto ext = Napi::External<Job>::New(
    env, job,
    [](Napi::Env, Job* j){
      if (!j) return;
      { std::lock_guard<std::mutex> lk(g_jobs_mu);
        auto it = std::find(g_jobs.begin(), g_jobs.end(), j);
        if (it != g_jobs.end()) g_jobs.erase(it);
      }
      j->stop();
      delete j;
    }
  );
  handle.DefineProperties({
    Napi::PropertyDescriptor::Value("_native", ext, napi_enumerable)
  });

  return handle;
}

static Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("schedule", Napi::Function::New(env, Schedule));
  return exports;
}

NODE_API_MODULE(cron, Init)