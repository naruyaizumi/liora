use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tracing::{debug, error};

use crate::auth::AuthService;

pub type AuthState = Arc<AuthService>;

#[derive(Debug, Deserialize)]
pub struct SetRequest {
    pub value: String,
}

#[derive(Debug, Deserialize)]
pub struct GetManyRequest {
    pub keys: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct SetManyRequest {
    pub data: HashMap<String, String>,
}

#[derive(Debug, Deserialize)]
pub struct DeleteManyRequest {
    pub keys: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct GetResponse {
    pub value: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct StatusResponse {
    pub success: bool,
    pub message: String,
}

pub async fn get_handler(
    State(auth): State<AuthState>,
    Path(key): Path<String>,
) -> impl IntoResponse {
    debug!("GET /get/{}", key);

    match auth.get(&key).await {
        Ok(value) => Json(GetResponse { value }).into_response(),
        Err(e) => {
            error!("Failed to get key {}: {}", key, e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(StatusResponse {
                    success: false,
                    message: e.to_string(),
                }),
            )
                .into_response()
        }
    }
}

pub async fn set_handler(
    State(auth): State<AuthState>,
    Path(key): Path<String>,
    Json(req): Json<SetRequest>,
) -> impl IntoResponse {
    debug!("POST /set/{}", key);

    match auth.set(&key, &req.value).await {
        Ok(_) => Json(StatusResponse {
            success: true,
            message: "Key set successfully".to_string(),
        })
        .into_response(),
        Err(e) => {
            error!("Failed to set key {}: {}", key, e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(StatusResponse {
                    success: false,
                    message: e.to_string(),
                }),
            )
                .into_response()
        }
    }
}

pub async fn get_many_handler(
    State(auth): State<AuthState>,
    Json(req): Json<GetManyRequest>,
) -> impl IntoResponse {
    debug!("POST /get-many: {} keys", req.keys.len());

    match auth.get_many(&req.keys).await {
        Ok(data) => Json(data).into_response(),
        Err(e) => {
            error!("Failed to get many keys: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(StatusResponse {
                    success: false,
                    message: e.to_string(),
                }),
            )
                .into_response()
        }
    }
}

pub async fn set_many_handler(
    State(auth): State<AuthState>,
    Json(req): Json<SetManyRequest>,
) -> impl IntoResponse {
    debug!("POST /set-many: {} keys", req.data.len());

    match auth.set_many(&req.data).await {
        Ok(_) => Json(StatusResponse {
            success: true,
            message: format!("{} keys set successfully", req.data.len()),
        })
        .into_response(),
        Err(e) => {
            error!("Failed to set many keys: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(StatusResponse {
                    success: false,
                    message: e.to_string(),
                }),
            )
                .into_response()
        }
    }
}

pub async fn delete_many_handler(
    State(auth): State<AuthState>,
    Json(req): Json<DeleteManyRequest>,
) -> impl IntoResponse {
    debug!("POST /delete-many: {} keys", req.keys.len());

    match auth.delete_many(&req.keys).await {
        Ok(_) => Json(StatusResponse {
            success: true,
            message: format!("{} keys deleted successfully", req.keys.len()),
        })
        .into_response(),
        Err(e) => {
            error!("Failed to delete many keys: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(StatusResponse {
                    success: false,
                    message: e.to_string(),
                }),
            )
                .into_response()
        }
    }
}

pub async fn clear_all_handler(State(auth): State<AuthState>) -> impl IntoResponse {
    debug!("POST /clear-all");

    match auth.clear_all().await {
        Ok(_) => Json(StatusResponse {
            success: true,
            message: "All keys cleared successfully".to_string(),
        })
        .into_response(),
        Err(e) => {
            error!("Failed to clear all keys: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(StatusResponse {
                    success: false,
                    message: e.to_string(),
                }),
            )
                .into_response()
        }
    }
}

pub async fn stats_handler(State(auth): State<AuthState>) -> impl IntoResponse {
    debug!("GET /stats");
    Json(auth.stats())
}

pub async fn health_handler() -> impl IntoResponse {
    Json(serde_json::json!({
        "status": "ok",
        "service": "liora"
    }))
}

pub fn create_router(auth: Arc<AuthService>) -> Router {
    Router::new()
        .route("/health", get(health_handler))
        .route("/get/{key}", get(get_handler))
        .route("/set/{key}", post(set_handler))
        .route("/get-many", post(get_many_handler))
        .route("/set-many", post(set_many_handler))
        .route("/delete-many", post(delete_many_handler))
        .route("/clear-all", post(clear_all_handler))
        .route("/stats", get(stats_handler))
        .with_state(auth)
}