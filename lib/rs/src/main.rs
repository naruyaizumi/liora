use anyhow::{Context, Result};
use futures::stream::StreamExt;
use signal_hook::consts::signal::*;
use signal_hook_tokio::Signals;
use std::env;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::process::{Child, Command};
use tokio::sync::RwLock;
use tokio::time::sleep;
use tracing::{debug, error, info, warn};

mod auth;
mod config;
mod http;

use config::Config;

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

    fn record_crash(&mut self, crash_window_secs: u64) {
        let now = Instant::now();

        if let Some(last) = self.last_crash {
            if now.duration_since(last).as_secs() < crash_window_secs {
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

    fn should_cooldown(&self, max_crashes: u32) -> bool {
        self.crash_count >= max_crashes
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
    config: Config,
}

impl Supervisor {
    fn new(bun_path: String, script_path: PathBuf, root_dir: PathBuf, config: Config) -> Self {
        Self {
            state: Arc::new(RwLock::new(SupervisorState::new())),
            shutting_down: Arc::new(AtomicBool::new(false)),
            bun_path,
            script_path,
            root_dir,
            config,
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

        let mut cmd = Command::new(&self.bun_path);
        cmd.arg(self.script_path.to_str().unwrap())
            .current_dir(&self.root_dir)
            .stdin(Stdio::null())
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit())
            .kill_on_drop(false);

        #[cfg(unix)]
        {
            unsafe {
                cmd.pre_exec(|| {
                    let ret = libc::setsid();
                    if ret == -1 {
                        return Err(std::io::Error::last_os_error());
                    }
                    Ok(())
                });
            }
        }

        let child = cmd
            .spawn()
            .context("Failed to spawn child process")?;

        let pid = child.id().unwrap_or(0);
        info!("Child process spawned (PID: {})", pid);

        let mut state = self.state.write().await;
        state.child_pid = Some(pid);
        drop(state);

        Ok(child)
    }

    fn kill_process_tree(pid: u32) -> std::io::Result<()> {
        if pid == 0 {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "invalid pid 0",
            ));
        }

        let pgid = -(pid as libc::pid_t);
        
        let res = unsafe { libc::kill(pgid, libc::SIGTERM) };
        if res == -1 {
            let err = std::io::Error::last_os_error();
            if err.raw_os_error() != Some(libc::ESRCH) {
                return Err(err);
            }
        }
        
        Ok(())
    }

    fn force_kill_process_tree(pid: u32) -> std::io::Result<()> {
        if pid == 0 {
            return Ok(());
        }

        let pgid = -(pid as libc::pid_t);
        let res = unsafe { libc::kill(pgid, libc::SIGKILL) };
        
        if res == -1 {
            let err = std::io::Error::last_os_error();
            if err.raw_os_error() != Some(libc::ESRCH) {
                return Err(err);
            }
        }
        
        Ok(())
    }

    async fn stop_child(&self, signal_name: &str) {
        if self.shutting_down.swap(true, Ordering::SeqCst) {
            debug!("Already shutting down, ignoring duplicate signal");
            return;
        }

        info!("Received shutdown signal: {}", signal_name);

        let mut state = self.state.write().await;
        let pid = state.child_pid.unwrap_or(0);
        let child_opt = state.child.take();
        drop(state);

        if pid == 0 {
            info!("No active child process to stop");
            return;
        }

        info!("Stopping child process tree (PGID: {})", pid);

        match Self::kill_process_tree(pid) {
            Ok(_) => info!("SIGTERM sent to process group {}", pid),
            Err(e) => warn!("Failed to send SIGTERM: {} (process may be dead)", e),
        }

        let graceful_timeout = Duration::from_secs(self.config.shutdown_timeout_secs);
        let start = Instant::now();
        
        if let Some(mut child) = child_opt {
            match tokio::time::timeout(graceful_timeout, child.wait()).await {
                Ok(Ok(status)) => {
                    info!("Child exited gracefully: {}", status);
                    return;
                }
                Ok(Err(e)) => {
                    warn!("Error waiting for child: {}", e);
                }
                Err(_) => {
                    let elapsed = start.elapsed().as_secs();
                    warn!("Child did not exit after {}s, forcing SIGKILL", elapsed);
                }
            }
        } else {
            sleep(graceful_timeout).await;
        }

        match Self::force_kill_process_tree(pid) {
            Ok(_) => info!("SIGKILL sent to process group {}", pid),
            Err(e) => warn!("SIGKILL error: {} (process may already be dead)", e),
        }

        sleep(Duration::from_millis(500)).await;

        let check_alive = unsafe { libc::kill(pid as libc::pid_t, 0) };
        if check_alive == 0 {
            error!("Process {} still alive after SIGKILL!", pid);
        } else {
            info!("Process cleanup confirmed");
        }

        let state = self.state.read().await;
        info!(
            "Supervisor uptime: {:.2}s, Total restarts: {}",
            state.uptime().as_secs_f64(),
            state.restart_count
        );
    }

    async fn health_check(&self) {
        let state = self.state.read().await;
        if let Some(pid) = state.child_pid {
            let alive = unsafe { libc::kill(pid as libc::pid_t, 0) } == 0;
            if !alive {
                warn!("Health check: Process {} appears dead", pid);
            } else {
                debug!(
                    "Health check - PID: {}, Uptime: {:.0}s, Restarts: {}",
                    pid,
                    state.uptime().as_secs_f64(),
                    state.restart_count
                );
            }
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
                    state.record_crash(self.config.crash_window_secs);
                    drop(state);

                    sleep(Duration::from_secs(self.config.restart_delay_secs)).await;
                    continue;
                }
            };

            {
                let mut state = self.state.write().await;
                state.child = Some(child);
                child = state.child.take().unwrap();
            }

            let exit_status = child.wait().await;

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

            {
                let mut state = self.state.write().await;
                state.child_pid = None;
            }

            if self.shutting_down.load(Ordering::SeqCst) {
                info!("Supervisor exiting");
                break;
            }

            let should_cooldown = {
                let mut state = self.state.write().await;
                state.record_crash(self.config.crash_window_secs);
                state.should_cooldown(self.config.max_crashes)
            };

            if should_cooldown {
                let state = self.state.read().await;
                warn!(
                    "Too many crashes ({}/{} in {}s). Cooling down for {}s...",
                    state.crash_count,
                    self.config.max_crashes,
                    self.config.crash_window_secs,
                    self.config.cooldown_secs
                );
                drop(state);

                sleep(Duration::from_secs(self.config.cooldown_secs)).await;

                let mut state = self.state.write().await;
                state.reset_crash_count();
            } else {
                let state = self.state.read().await;
                info!(
                    "Restarting after crash ({}/{}). Waiting {}s...",
                    state.crash_count,
                    self.config.max_crashes,
                    self.config.restart_delay_secs
                );
                drop(state);

                sleep(Duration::from_secs(self.config.restart_delay_secs)).await;
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
            let mut interval = tokio::time::interval(Duration::from_secs(30));
            loop {
                interval.tick().await;
                if supervisor_clone.shutting_down.load(Ordering::SeqCst) {
                    break;
                }
                supervisor_clone.health_check().await;
            }
        });

        self.supervise().await;
    }

    async fn handle_signals(&self) -> Result<()> {
        let mut signals =
            Signals::new([SIGINT, SIGTERM])?.context("Failed to register signal handlers")?;

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
    let config = Config::from_env()?;
    
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .with_target(false)
        .with_ansi(true)
        .init();

    info!("🚀 Liora Supervisor v1.0.1 starting...");

    let root_dir = env::current_dir().context("Failed to get current directory")?;
    let bun_path = env::var("BUN_PATH").unwrap_or_else(|_| {
        let home = env::var("HOME").unwrap_or_else(|_| "/root".to_string());
        format!("{}/.bun/bin/bun", home)
    });
    let script_path = root_dir.join("src").join("main.js");

    info!("📁 Working directory: {}", root_dir.display());
    info!("🔧 Bun path: {}", bun_path);
    info!("📄 Script path: {}", script_path.display());

    if !script_path.exists() {
        error!("Script not found: {}", script_path.display());
        anyhow::bail!("Script file does not exist");
    }

    info!("🐘 Initializing PostgreSQL auth service...");
    let auth = Arc::new(auth::AuthService::new(config.clone()).await?);
    auth.init_schema().await?;
    info!("⚡ Auth service ready");

    let http_addr = format!("{}:{}", config.http_host, config.http_port);
    let http_router = http::create_router(Arc::clone(&auth));

    info!("🌐 Starting HTTP API server on {}", http_addr);
    let listener = tokio::net::TcpListener::bind(&http_addr)
        .await
        .context(format!("Failed to bind HTTP server to {}", http_addr))?;

    tokio::spawn(async move {
        axum::serve(listener, http_router)
            .await
            .expect("HTTP server failed");
    });

    info!("📡 HTTP API server running");

    let supervisor = Arc::new(Supervisor::new(
        bun_path,
        script_path,
        root_dir,
        config.clone(),
    ));

    supervisor
        .ensure_directories()
        .await
        .context("Failed to setup directories")?;

    info!("🔥 Supervisor initialized successfully");
    info!(
        "📊 Max crashes: {}/{} seconds",
        config.max_crashes, config.crash_window_secs
    );
    info!(
        "⏱️  Restart delay: {}s, Cooldown: {}s",
        config.restart_delay_secs, config.cooldown_secs
    );
    info!("🛑 Shutdown timeout: {}s", config.shutdown_timeout_secs);

    supervisor.start().await;

    info!("👋 Supervisor exited cleanly");
    Ok(())
}