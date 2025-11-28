import EventEmitter from "eventemitter3";
import os from "os";

export class WorkerPool extends EventEmitter {
    constructor(workerPath, poolSize = null) {
        super();
        
        this.workerPath = workerPath;
        this.poolSize = poolSize || Math.max(4, os.cpus().length);
        this.workers = [];
        this.queue = [];
        this.activeWorkers = new Map();
        this.workerErrors = new Map();
        this.shuttingDown = false;
        this.maxQueueSize = 10000;
        this.taskTimeout = 300000;
        
        this._initWorkers();
    }

    _initWorkers() {
        for (let i = 0; i < this.poolSize; i++) {
            this._createWorker(i);
        }
    }

    _createWorker(id) {
        const worker = new Worker(this.workerPath);
        worker.workerId = id;
        worker.taskCount = 0;
        
        worker.addEventListener("message", (event) => {
            this._handleWorkerMessage(worker, event.data);
        });

        worker.addEventListener("error", (event) => {
            this._handleWorkerError(worker, event.error || event);
        });

        worker.addEventListener("close", () => {
            this._handleWorkerExit(worker, 0);
        });

        this.workers.push(worker);
        this.workerErrors.set(worker, 0);
        
        this.emit("worker:created", { workerId: id });
    }

    _handleWorkerMessage(worker, result) {
        const taskInfo = this.activeWorkers.get(worker);
        
        if (!taskInfo) {
            console.error(`[WorkerPool] Received message from idle worker ${worker.workerId}`);
            return;
        }

        if (taskInfo.timeout) {
            clearTimeout(taskInfo.timeout);
        }

        this.activeWorkers.delete(worker);
        worker.taskCount++;

        if (result.error) {
            taskInfo.reject(new Error(result.error));
        } else {
            taskInfo.resolve(result.data);
        }

        this.emit("task:completed", {
            workerId: worker.workerId,
            duration: Date.now() - taskInfo.startTime,
        });

        this._processQueue();
    }

    _handleWorkerError(worker, err) {
        console.error(`[WorkerPool] Worker ${worker.workerId} error:`, err.message || err);
        
        const errorCount = (this.workerErrors.get(worker) || 0) + 1;
        this.workerErrors.set(worker, errorCount);

        const taskInfo = this.activeWorkers.get(worker);
        if (taskInfo) {
            if (taskInfo.timeout) clearTimeout(taskInfo.timeout);
            this.activeWorkers.delete(worker);
            taskInfo.reject(new Error(`Worker error: ${err.message || err}`));
        }

        this.emit("worker:error", {
            workerId: worker.workerId,
            error: err.message || String(err),
            errorCount,
        });

        if (errorCount >= 3) {
            this._recycleWorker(worker);
        } else {
            this._processQueue();
        }
    }

    _handleWorkerExit(worker, code) {
        if (this.shuttingDown) return;

        console.error(`[WorkerPool] Worker ${worker.workerId} exited with code ${code}`);

        const taskInfo = this.activeWorkers.get(worker);
        if (taskInfo) {
            if (taskInfo.timeout) clearTimeout(taskInfo.timeout);
            this.activeWorkers.delete(worker);
            taskInfo.reject(new Error(`Worker crashed with code ${code}`));
        }

        this.emit("worker:exit", { workerId: worker.workerId, code });

        this._recycleWorker(worker);
    }

    _recycleWorker(oldWorker) {
        const idx = this.workers.indexOf(oldWorker);
        if (idx === -1) return;

        this.workers.splice(idx, 1);
        this.workerErrors.delete(oldWorker);
        this.activeWorkers.delete(oldWorker);

        try {
            oldWorker.terminate();
        } catch {
            // Ignore
        }

        this._createWorker(oldWorker.workerId);
        this._processQueue();
    }

    _processQueue() {
        if (this.shuttingDown || this.queue.length === 0) return;

        const availableWorker = this.workers.find(
            (w) => !this.activeWorkers.has(w)
        );

        if (!availableWorker) return;

        const task = this.queue.shift();
        
        const timeout = setTimeout(() => {
            const taskInfo = this.activeWorkers.get(availableWorker);
            if (taskInfo) {
                this.activeWorkers.delete(availableWorker);
                taskInfo.reject(new Error("Task timeout exceeded"));
                
                this._recycleWorker(availableWorker);
            }
        }, this.taskTimeout);

        this.activeWorkers.set(availableWorker, {
            ...task,
            timeout,
            startTime: Date.now(),
        });

        try {
            availableWorker.postMessage(task.data);
        } catch (err) {
            clearTimeout(timeout);
            this.activeWorkers.delete(availableWorker);
            task.reject(err);
            this._processQueue();
        }
    }

    async execute(data) {
        if (this.shuttingDown) {
            throw new Error("WorkerPool is shutting down");
        }

        if (this.queue.length >= this.maxQueueSize) {
            throw new Error(`Queue is full (max: ${this.maxQueueSize})`);
        }

        return new Promise((resolve, reject) => {
            this.queue.push({ data, resolve, reject });
            this._processQueue();
        });
    }

    getStats() {
        const workers = this.workers.map((w) => ({
            id: w.workerId,
            active: this.activeWorkers.has(w),
            taskCount: w.taskCount,
            errors: this.workerErrors.get(w) || 0,
        }));

        return {
            poolSize: this.poolSize,
            workers,
            activeWorkers: this.activeWorkers.size,
            queuedTasks: this.queue.length,
            availableWorkers: this.poolSize - this.activeWorkers.size,
            totalCompleted: workers.reduce((sum, w) => sum + w.taskCount, 0),
        };
    }

    getHealth() {
        const stats = this.getStats();
        const totalErrors = stats.workers.reduce((sum, w) => sum + w.errors, 0);
        const queueUtilization = (stats.queuedTasks / this.maxQueueSize) * 100;
        
        let status = "healthy";
        if (queueUtilization > 80) status = "overloaded";
        else if (totalErrors > 10) status = "degraded";
        else if (stats.availableWorkers === 0) status = "busy";

        return {
            status,
            queueUtilization: queueUtilization.toFixed(2) + "%",
            totalErrors,
            uptime: process.uptime(),
        };
    }

    async terminate() {
        if (this.shuttingDown) return;
        
        this.shuttingDown = true;
        this.emit("pool:shutdown");

        for (const task of this.queue) {
            task.reject(new Error("WorkerPool terminated"));
        }
        this.queue = [];

        const waitForActive = new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (this.activeWorkers.size === 0) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);

            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, 10000);
        });

        await waitForActive;

        await Promise.all(
            this.workers.map((worker) =>
                Promise.resolve(worker.terminate()).catch(() => {})
            )
        );

        this.workers = [];
        this.activeWorkers.clear();
        this.workerErrors.clear();

        this.emit("pool:terminated");
    }
}