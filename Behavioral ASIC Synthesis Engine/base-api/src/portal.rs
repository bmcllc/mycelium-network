//! Portal forense — UI estática servida pelo próprio base-api (Fase 3).

use axum::http::{header, StatusCode};
use axum::response::IntoResponse;

pub const PORTAL_HTML: &str = include_str!("portal.html");

pub async fn portal() -> impl IntoResponse {
    (
        StatusCode::OK,
        [(header::CONTENT_TYPE, "text/html; charset=utf-8")],
        PORTAL_HTML,
    )
}
