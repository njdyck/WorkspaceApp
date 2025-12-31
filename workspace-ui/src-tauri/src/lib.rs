use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn open_webview_window(
    app: tauri::AppHandle,
    url: String,
    title: String,
    width: f64,
    height: f64,
) -> Result<String, String> {
    let window_id = format!("webview-{}", uuid::Uuid::new_v4());
    
    let webview_url = WebviewUrl::External(url.parse().map_err(|e| format!("Invalid URL: {}", e))?);
    
    WebviewWindowBuilder::new(&app, &window_id, webview_url)
        .title(&title)
        .inner_size(width, height)
        .resizable(true)
        .decorations(true)
        .center()
        .build()
        .map_err(|e| format!("Failed to create window: {}", e))?;
    
    Ok(window_id)
}

#[tauri::command]
async fn close_webview_window(app: tauri::AppHandle, window_id: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&window_id) {
        window.close().map_err(|e| format!("Failed to close window: {}", e))?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, open_webview_window, close_webview_window])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
