use anyhow::{Context, Result};
use futures::stream::StreamExt;
use signal_hook::consts::signal::*;
use signal_hook_tokio::Signals;
use std::env;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::process::{Child, Command};
use tokio::sync::RwLock;
use tokio::time::sleep;
use tracing::{debug, error, info, warn};
use tracing_subscriber::fmt::format::FmtSpan;

const MAX_CRASHES: u32 = 5;
const CRASH_WINDOW_SECS: u64 = 60;
const COOLDOWN_SECS: u64 = 10;
const RESTART_DELAY_SECS: u64 = 2;
const SHUTDOWN_TIMEOUT_SECS: u64 = 8;
const HEALTH_CHECK_INTERVAL_SECS: u64 = 30;

#[derive(Debug)]
struct SupervisorState {
    child: Option<Child>,
    child_pid: Option<u32>,
    crash_count: u32,
    last_crash: Option<Instant>,
    start_time: Instant,
    restart_count: u64,
}

impl SupervisorState {
    fn new() -> Self {
        Self {
            child: None,
            child_pid: None,
            crash_count: 0,
            last_crash: None,
            start_time: Instant::now(),
            restart_count: 0,
        }
    }

    fn record_crash(&mut self) {
        let now = Instant::now();

        if let Some(last) = self.last_crash {
            if now.duration_since(last).as_secs() < CRASH_WINDOW_SECS {
                self.crash_count += 1;
            } else {
                self.crash_count = 1;
            }
        } else {
            self.crash_count = 1;
        }

        self.last_crash = Some(now);
        self.restart_count += 1;
    }

    fn should_cooldown(&self) -> bool {
        self.crash_count >= MAX_CRASHES
    }

    fn reset_crash_count(&mut self) {
        self.crash_count = 0;
    }

    fn uptime(&self) -> Duration {
        Instant::now().duration_since(self.start_time)
    }
}

struct Supervisor {
    state: Arc<RwLock<SupervisorState>>,
    shutting_down: Arc<AtomicBool>,
    bun_path: String,
    script_path: PathBuf,
    root_dir: PathBuf,
}

impl Supervisor {
    fn new(bun_path: String, script_path: PathBuf, root_dir: PathBuf) -> Self {
        Self {
            state: Arc::new(RwLock::new(SupervisorState::new())),
            shutting_down: Arc::new(AtomicBool::new(false)),
            bun_path,
            script_path,
            root_dir,
        }
    }

    async fn ensure_directories(&self) -> Result<()> {
        let db_dir = self.root_dir.join("database");
        tokio::fs::create_dir_all(&db_dir)
            .await
            .context("Failed to create database directory")?;
        debug!("Database directory ensured: {}", db_dir.display());
        Ok(())
    }

    async fn spawn_child(&self) -> Result<Child> {
        debug!("Spawning child process...");
        
        let child = Command::new(&self.bun_path)
            .arg(self.script_path.to_str().unwrap())
            .current_dir(&self.root_dir)
            .stdin(Stdio::inherit())
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit())
            .kill_on_drop(false)
            .spawn()
            .context("Failed to spawn child process")?;

        let pid = child.id().unwrap_or(0);
        info!("Child process spawned (PID: {})", pid);

        let mut state = self.state.write().await;
        state.child_pid = Some(pid);
        drop(state);

        Ok(child)
    }

    async fn stop_child(&self, signal_name: &str) {
        if self.shutting_down.swap(true, Ordering::SeqCst) {
            debug!("Already shutting down, ignoring duplicate signal");
            return;
        }

        info!("Received shutdown signal: {}", signal_name);

        let mut state = self.state.write().await;

        if let Some(mut child) = state.child.take() {
            let pid = state.child_pid.unwrap_or(0);
            info!("Gracefully stopping child process (PID: {})...", pid);
            drop(state);

            if let Err(e) = child.start_kill() {
                error!("Failed to send SIGTERM: {}", e);
            }

            let timeout_result =
                tokio::time::timeout(Duration::from_secs(SHUTDOWN_TIMEOUT_SECS), child.wait())
                    .await;

            match timeout_result {
                Ok(Ok(status)) => {
                    if status.success() {
                        info!("Child exited cleanly");
                    } else {
                        warn!("Child exited with status: {}", status);
                    }
                }
                Ok(Err(e)) => {
                    error!("Error waiting for child: {}", e);
                }
                Err(_) => {
                    warn!(
                        "Child unresponsive after {}s, force killing...",
                        SHUTDOWN_TIMEOUT_SECS
                    );
                    if let Err(e) = child.kill().await {
                        error!("Failed to kill child: {}", e);
                    }
                }
            }
        } else {
            info!("No active child process to stop");
        }

        let state = self.state.read().await;
        info!(
            "Supervisor uptime: {:.2}s, Total restarts: {}",
            state.uptime().as_secs_f64(),
            state.restart_count
        );
        drop(state);

        sleep(Duration::from_millis(100)).await;
        info!("Supervisor shutdown complete");
        std::process::exit(0);
    }

    async fn health_check(&self) {
        let state = self.state.read().await;
        if let Some(pid) = state.child_pid {
            debug!(
                "Health check - Child PID: {}, Uptime: {:.0}s, Restarts: {}",
                pid,
                state.uptime().as_secs_f64(),
                state.restart_count
            );
        }
    }

    async fn supervise(&self) {
        loop {
            if self.shutting_down.load(Ordering::SeqCst) {
                info!("Supervisor shutting down");
                break;
            }

            let child_result = self.spawn_child().await;

            let mut child = match child_result {
                Ok(c) => c,
                Err(e) => {
                    error!("Failed to spawn child: {:?}", e);
                    let mut state = self.state.write().await;
                    state.record_crash();
                    drop(state);

                    sleep(Duration::from_secs(RESTART_DELAY_SECS)).await;
                    continue;
                }
            };

            {
                let mut state = self.state.write().await;
                state.child = Some(child);
            }

            let child_ref = {
                let mut state = self.state.write().await;
                state.child.take()
            };

            if let Some(mut child_proc) = child_ref {
                let exit_status = child_proc.wait().await;

                match exit_status {
                    Ok(status) => {
                        if status.success() {
                            info!("Child exited successfully (code: 0)");
                            if self.shutting_down.load(Ordering::SeqCst) {
                                break;
                            }
                        } else if let Some(code) = status.code() {
                            warn!("Child exited with code: {}", code);
                        } else {
                            warn!("Child terminated by signal");
                        }
                    }
                    Err(e) => {
                        error!("Error waiting for child: {}", e);
                    }
                }
            }

            if self.shutting_down.load(Ordering::SeqCst) {
                info!("Supervisor shutting down");
                break;
            }

            let should_cooldown = {
                let mut state = self.state.write().await;
                state.record_crash();
                state.should_cooldown()
            };

            if should_cooldown {
                let state = self.state.read().await;
                warn!(
                    "Too many crashes ({}/{} in {}s). Cooling down for {}s...",
                    state.crash_count, MAX_CRASHES, CRASH_WINDOW_SECS, COOLDOWN_SECS
                );
                drop(state);

                sleep(Duration::from_secs(COOLDOWN_SECS)).await;

                let mut state = self.state.write().await;
                state.reset_crash_count();
            } else {
                let state = self.state.read().await;
                info!(
                    "Restarting after crash ({}/{}). Waiting {}s...",
                    state.crash_count, MAX_CRASHES, RESTART_DELAY_SECS
                );
                drop(state);

                sleep(Duration::from_secs(RESTART_DELAY_SECS)).await;
            }
        }
    }

    async fn start(self: Arc<Self>) {
        let supervisor_clone = self.clone();
        tokio::spawn(async move {
            if let Err(e) = supervisor_clone.handle_signals().await {
                error!("Signal handler error: {}", e);
            }
        });

        let supervisor_clone = self.clone();
        tokio::spawn(async move {
            let mut interval =
                tokio::time::interval(Duration::from_secs(HEALTH_CHECK_INTERVAL_SECS));
            loop {
                interval.tick().await;
                supervisor_clone.health_check().await;
            }
        });

        self.supervise().await;
    }

    async fn handle_signals(&self) -> Result<()> {
        let mut signals = Signals::new(&[SIGINT, SIGTERM])
            .context("Failed to register signal handlers")?;

        while let Some(signal) = signals.next().await {
            match signal {
                SIGINT => {
                    info!("Received SIGINT");
                    self.stop_child("SIGINT").await;
                    break;
                }
                SIGTERM => {
                    info!("Received SIGTERM");
                    self.stop_child("SIGTERM").await;
                    break;
                }
                _ => {
                    debug!("Received unknown signal: {}", signal);
                }
            }
        }

        Ok(())
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_target(false)
        .with_level(true)
        .with_ansi(true)
        .with_span_events(FmtSpan::CLOSE)
        .with_thread_ids(false)
        .with_thread_names(false)
        .init();

    info!("Liora Supervisor starting...");

    let root_dir = env::current_dir().context("Failed to get current directory")?;
    let bun_path = env::var("BUN_PATH").unwrap_or_else(|_| {
        let home = env::var("HOME").unwrap_or_else(|_| "/root".to_string());
        format!("{}/.bun/bin/bun", home)
    });
    let script_path = root_dir.join("src").join("main.js");

    info!("Working directory: {}", root_dir.display());
    info!("Bun path: {}", bun_path);
    info!("Script path: {}", script_path.display());

    if !script_path.exists() {
        error!("Script not found: {}", script_path.display());
        anyhow::bail!("Script file does not exist");
    }

    let supervisor = Arc::new(Supervisor::new(bun_path, script_path, root_dir));

    supervisor
        .ensure_directories()
        .await
        .context("Failed to setup directories")?;

    info!("Supervisor initialized successfully");
    info!("Max crashes: {}/{} seconds", MAX_CRASHES, CRASH_WINDOW_SECS);
    info!("Restart delay: {}s, Cooldown: {}s", RESTART_DELAY_SECS, COOLDOWN_SECS);
    info!("Shutdown timeout: {}s", SHUTDOWN_TIMEOUT_SECS);

    supervisor.start().await;

    Ok(())
}