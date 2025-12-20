#pragma once

#include <atomic>
#include <condition_variable>
#include <functional>
#include <future>
#include <memory>
#include <mutex>
#include <queue>
#include <stdexcept>
#include <thread>
#include <vector>

class ThreadPool {
public:
    explicit ThreadPool(size_t num_threads = 0) : stop_(false), active_tasks_(0) {
        if (num_threads == 0) {
            num_threads = std::max(4u, std::thread::hardware_concurrency());
        }

        num_threads = std::min(num_threads, size_t(32));

        workers_.reserve(num_threads);
        for (size_t i = 0; i < num_threads; ++i) {
            workers_.emplace_back([this] { worker_loop(); });
        }
    }

    ~ThreadPool() { shutdown(); }

    ThreadPool(const ThreadPool&) = delete;
    ThreadPool& operator=(const ThreadPool&) = delete;
    ThreadPool(ThreadPool&&) = delete;
    ThreadPool& operator=(ThreadPool&&) = delete;

    template <class F, class... Args>
    auto enqueue(F&& f,
                 Args&&... args) -> std::future<typename std::invoke_result<F, Args...>::type> {
        using return_type = typename std::invoke_result<F, Args...>::type;

        auto task = std::make_shared<std::packaged_task<return_type()>>(
                std::bind(std::forward<F>(f), std::forward<Args>(args)...));

        std::future<return_type> result = task->get_future();

        {
            std::unique_lock<std::mutex> lock(queue_mutex_);

            if (stop_) {
                throw std::runtime_error("ThreadPool: enqueue on stopped pool");
            }

            if (tasks_.size() >= max_queue_size_) {
                throw std::runtime_error("ThreadPool: queue is full");
            }

            tasks_.emplace([task]() { (*task)(); });
        }

        condition_.notify_one();
        return result;
    }

    void shutdown() {
        {
            std::unique_lock<std::mutex> lock(queue_mutex_);
            if (stop_)
                return;
            stop_ = true;
        }

        condition_.notify_all();

        for (std::thread& worker : workers_) {
            if (worker.joinable()) {
                worker.join();
            }
        }

        workers_.clear();
    }

    size_t queue_size() const {
        std::unique_lock<std::mutex> lock(queue_mutex_);
        return tasks_.size();
    }

    size_t thread_count() const { return workers_.size(); }

    size_t active_count() const { return active_tasks_.load(); }

    bool is_running() const { return !stop_; }

private:
    void worker_loop() {
        while (true) {
            std::function<void()> task;

            {
                std::unique_lock<std::mutex> lock(queue_mutex_);
                condition_.wait(lock, [this] { return stop_ || !tasks_.empty(); });

                if (stop_ && tasks_.empty()) {
                    return;
                }

                task = std::move(tasks_.front());
                tasks_.pop();
            }

            active_tasks_++;

            try {
                task();
            } catch (const std::exception& e) {
                (void)e;
            } catch (...) {
                // swallow
            }

            active_tasks_--;
        }
    }

    std::vector<std::thread> workers_;
    std::queue<std::function<void()>> tasks_;

    mutable std::mutex queue_mutex_;
    std::condition_variable condition_;

    std::atomic<bool> stop_;
    std::atomic<size_t> active_tasks_;

    static constexpr size_t max_queue_size_ = 10000;
};

inline ThreadPool& get_sticker_pool() {
    static ThreadPool pool(8);
    return pool;
}

inline ThreadPool& get_converter_pool() {
    static ThreadPool pool(8);
    return pool;
}