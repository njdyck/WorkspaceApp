//! CEF Off-Screen Rendering Plugin for Tauri
//!
//! Renders web content to GPU textures that can be displayed in a WebGL canvas.

mod manager;
mod renderer;
mod transfer;

use manager::BrowserManager;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{
    plugin::{Builder, TauriPlugin},
    AppHandle, Manager, Runtime, State,
};

// ============================================================================
// TYPES
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CefBounds {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserInfo {
    pub id: String,
    pub url: String,
    pub bounds: CefBounds,
    pub is_loading: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FrameData {
    pub browser_id: String,
    pub width: u32,
    pub height: u32,
    pub format: String, // "BGRA8"
    pub data: Vec<u8>,  // Raw pixel data
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MouseEvent {
    pub x: i32,
    pub y: i32,
    pub button: i32,       // 0=left, 1=middle, 2=right
    pub event_type: String, // "move", "down", "up", "wheel"
    pub delta_x: f32,      // For wheel events
    pub delta_y: f32,
    pub modifiers: u32,    // Ctrl, Shift, Alt flags
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyEvent {
    pub key_code: i32,
    pub char_code: u32,
    pub event_type: String, // "down", "up", "char"
    pub modifiers: u32,
}

// ============================================================================
// PLUGIN STATE
// ============================================================================

pub struct CefPluginState {
    manager: Arc<RwLock<Option<BrowserManager>>>,
    initialized: Arc<RwLock<bool>>,
}

impl Default for CefPluginState {
    fn default() -> Self {
        Self {
            manager: Arc::new(RwLock::new(None)),
            initialized: Arc::new(RwLock::new(false)),
        }
    }
}

// ============================================================================
// COMMANDS
// ============================================================================

/// Initialize CEF - must be called before creating browsers
#[tauri::command]
async fn cef_init(state: State<'_, CefPluginState>) -> Result<(), String> {
    let mut initialized = state.initialized.write();
    if *initialized {
        return Ok(());
    }

    let manager = BrowserManager::new().map_err(|e| format!("Failed to init CEF: {}", e))?;

    *state.manager.write() = Some(manager);
    *initialized = true;

    log::info!("CEF initialized successfully");
    Ok(())
}

/// Shutdown CEF - cleanup all resources
#[tauri::command]
async fn cef_shutdown(state: State<'_, CefPluginState>) -> Result<(), String> {
    let mut manager = state.manager.write();
    if let Some(m) = manager.take() {
        m.shutdown();
    }
    *state.initialized.write() = false;

    log::info!("CEF shutdown complete");
    Ok(())
}

/// Create a new browser instance
#[tauri::command]
async fn cef_create_browser(
    state: State<'_, CefPluginState>,
    id: String,
    url: String,
    bounds: CefBounds,
) -> Result<BrowserInfo, String> {
    let manager = state.manager.read();
    let manager = manager.as_ref().ok_or("CEF not initialized")?;

    manager.create_browser(&id, &url, bounds.clone())
        .map_err(|e| format!("Failed to create browser: {}", e))?;

    Ok(BrowserInfo {
        id,
        url,
        bounds,
        is_loading: true,
    })
}

/// Close a browser instance
#[tauri::command]
async fn cef_close_browser(
    state: State<'_, CefPluginState>,
    id: String,
) -> Result<(), String> {
    let manager = state.manager.read();
    let manager = manager.as_ref().ok_or("CEF not initialized")?;

    manager.close_browser(&id)
        .map_err(|e| format!("Failed to close browser: {}", e))
}

/// Update browser bounds (position/size)
#[tauri::command]
async fn cef_update_bounds(
    state: State<'_, CefPluginState>,
    id: String,
    bounds: CefBounds,
) -> Result<(), String> {
    let manager = state.manager.read();
    let manager = manager.as_ref().ok_or("CEF not initialized")?;

    manager.update_bounds(&id, bounds)
        .map_err(|e| format!("Failed to update bounds: {}", e))
}

/// Navigate to a URL
#[tauri::command]
async fn cef_navigate(
    state: State<'_, CefPluginState>,
    id: String,
    url: String,
) -> Result<(), String> {
    let manager = state.manager.read();
    let manager = manager.as_ref().ok_or("CEF not initialized")?;

    manager.navigate(&id, &url)
        .map_err(|e| format!("Failed to navigate: {}", e))
}

/// Get the latest frame data for a browser (raw pixels)
#[tauri::command]
async fn cef_get_frame(
    state: State<'_, CefPluginState>,
    id: String,
) -> Result<Option<FrameData>, String> {
    let manager = state.manager.read();
    let manager = manager.as_ref().ok_or("CEF not initialized")?;

    Ok(manager.get_frame(&id))
}

/// Get frame data for all browsers (batch operation for efficiency)
#[tauri::command]
async fn cef_get_all_frames(
    state: State<'_, CefPluginState>,
) -> Result<Vec<FrameData>, String> {
    let manager = state.manager.read();
    let manager = manager.as_ref().ok_or("CEF not initialized")?;

    Ok(manager.get_all_frames())
}

/// Send mouse event to browser
#[tauri::command]
async fn cef_send_mouse_event(
    state: State<'_, CefPluginState>,
    id: String,
    event: MouseEvent,
) -> Result<(), String> {
    let manager = state.manager.read();
    let manager = manager.as_ref().ok_or("CEF not initialized")?;

    manager.send_mouse_event(&id, event)
        .map_err(|e| format!("Failed to send mouse event: {}", e))
}

/// Send keyboard event to browser
#[tauri::command]
async fn cef_send_key_event(
    state: State<'_, CefPluginState>,
    id: String,
    event: KeyEvent,
) -> Result<(), String> {
    let manager = state.manager.read();
    let manager = manager.as_ref().ok_or("CEF not initialized")?;

    manager.send_key_event(&id, event)
        .map_err(|e| format!("Failed to send key event: {}", e))
}

/// Focus a browser (for keyboard input)
#[tauri::command]
async fn cef_focus_browser(
    state: State<'_, CefPluginState>,
    id: String,
) -> Result<(), String> {
    let manager = state.manager.read();
    let manager = manager.as_ref().ok_or("CEF not initialized")?;

    manager.focus_browser(&id)
        .map_err(|e| format!("Failed to focus browser: {}", e))
}

/// List all active browsers
#[tauri::command]
async fn cef_list_browsers(
    state: State<'_, CefPluginState>,
) -> Result<Vec<BrowserInfo>, String> {
    let manager = state.manager.read();
    let manager = manager.as_ref().ok_or("CEF not initialized")?;

    Ok(manager.list_browsers())
}

// ============================================================================
// PLUGIN BUILDER
// ============================================================================

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("cef")
        .setup(|app, _api| {
            app.manage(CefPluginState::default());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            cef_init,
            cef_shutdown,
            cef_create_browser,
            cef_close_browser,
            cef_update_bounds,
            cef_navigate,
            cef_get_frame,
            cef_get_all_frames,
            cef_send_mouse_event,
            cef_send_key_event,
            cef_focus_browser,
            cef_list_browsers,
        ])
        .build()
}
