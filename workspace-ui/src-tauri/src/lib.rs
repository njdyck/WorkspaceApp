use tauri::{
    Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindowBuilder,
};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::Mutex;

// ============================================================================
// WEB TAB MANAGEMENT - Native Webviews als Canvas-Tabs
// ============================================================================

/// State für alle aktiven Web-Tabs
struct WebTabState {
    tabs: HashMap<String, WebTabInfo>,
}

#[derive(Clone, Serialize, Deserialize)]
struct WebTabInfo {
    id: String,
    url: String,
    is_fullscreen: bool,
    // Gespeicherte Position vor Fullscreen
    saved_bounds: Option<TabBounds>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct TabBounds {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct WebTabCreatedEvent {
    pub tab_id: String,
    pub url: String,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct WebTabFocusEvent {
    pub tab_id: String,
    pub focused: bool,
}

// ============================================================================
// TAURI COMMANDS
// ============================================================================

/// Erstellt einen neuen Web-Tab als frameless Window
#[tauri::command]
async fn create_web_tab(
    app: tauri::AppHandle,
    state: tauri::State<'_, Mutex<WebTabState>>,
    tab_id: String,
    url: String,
    bounds: TabBounds,
) -> Result<String, String> {
    // Prüfen ob bereits ein Fenster mit dieser ID existiert - falls ja, schließen
    if let Some(existing_window) = app.get_webview_window(&tab_id) {
        existing_window.close().ok();
        // Aus State entfernen falls vorhanden
        {
            let mut tab_state = state.lock().unwrap();
            tab_state.tabs.remove(&tab_id);
        }
    }

    let webview_url = WebviewUrl::External(
        url.parse().map_err(|e| format!("Invalid URL: {}", e))?
    );

    // Hauptfenster holen für relative Positionierung
    let main_window = app
        .get_webview_window("main")
        .ok_or("Main window not found")?;
    
    // Use inner_position to get coordinates relative to the content area (excluding title bar)
    let main_pos = main_window
        .inner_position()
        .map_err(|e| format!("Failed to get main window position: {}", e))?;

    // Absolutes Positioning relativ zum Hauptfenster
    let abs_x = main_pos.x + bounds.x;
    let abs_y = main_pos.y + bounds.y;

    // Frameless Window erstellen - als Child des Hauptfensters
    let webview = WebviewWindowBuilder::new(&app, &tab_id, webview_url)
        .title("")
        .inner_size(bounds.width as f64, bounds.height as f64)
        .position(abs_x as f64, abs_y as f64)
        .decorations(false)  // Kein OS-Frame
        .resizable(false)    // Resize über Canvas
        .skip_taskbar(true)  // Nicht in Taskbar zeigen
        .always_on_top(true) // Immer vor dem Hauptfenster
        .focused(false)      // Nicht sofort fokussieren
        .visible(true)
        .parent(&main_window)
        .map_err(|e| format!("Failed to set parent: {}", e))?
        .build()
        .map_err(|e| format!("Failed to create web tab: {}", e))?;

    // Tab in State speichern
    {
        let mut tab_state = state.lock().unwrap();
        tab_state.tabs.insert(
            tab_id.clone(),
            WebTabInfo {
                id: tab_id.clone(),
                url: url.clone(),
                is_fullscreen: false,
                saved_bounds: None,
            },
        );
    }

    // Event an Frontend senden
    app.emit("web-tab-created", WebTabCreatedEvent {
        tab_id: tab_id.clone(),
        url,
    }).ok();

    // Focus-Events für diesen Tab
    let app_handle = app.clone();
    let tab_id_clone = tab_id.clone();
    webview.on_window_event(move |event| {
        match event {
            tauri::WindowEvent::Focused(focused) => {
                let is_focused = *focused;
                app_handle.emit("web-tab-focus", WebTabFocusEvent {
                    tab_id: tab_id_clone.clone(),
                    focused: is_focused,
                }).ok();
            }
            tauri::WindowEvent::CloseRequested { .. } => {
                app_handle.emit("web-tab-closed", tab_id_clone.clone()).ok();
            }
            _ => {}
        }
    });

    Ok(tab_id)
}

/// Aktualisiert Position und Größe eines Web-Tabs
#[tauri::command]
async fn update_web_tab_bounds(
    app: tauri::AppHandle,
    tab_id: String,
    bounds: TabBounds,
) -> Result<(), String> {
    let webview = app
        .get_webview_window(&tab_id)
        .ok_or("Web tab not found")?;

    // Hauptfenster für relative Positionierung
    let main_window = app
        .get_webview_window("main")
        .ok_or("Main window not found")?;
    
    // Use inner_position to account for title bar/decorations
    let main_pos = main_window
        .inner_position()
        .map_err(|e| format!("Failed to get main window position: {}", e))?;

    let abs_x = main_pos.x + bounds.x;
    let abs_y = main_pos.y + bounds.y;

    webview
        .set_position(PhysicalPosition::new(abs_x, abs_y))
        .map_err(|e| format!("Failed to set position: {}", e))?;

    webview
        .set_size(PhysicalSize::new(bounds.width, bounds.height))
        .map_err(|e| format!("Failed to set size: {}", e))?;

    Ok(())
}

/// Fokussiert einen Web-Tab
#[tauri::command]
async fn focus_web_tab(app: tauri::AppHandle, tab_id: String) -> Result<(), String> {
    let webview = app
        .get_webview_window(&tab_id)
        .ok_or("Web tab not found")?;

    webview
        .set_focus()
        .map_err(|e| format!("Failed to focus: {}", e))?;

    Ok(())
}

/// Unfokussiert Web-Tab (fokussiert Hauptfenster)
#[tauri::command]
async fn unfocus_web_tabs(app: tauri::AppHandle) -> Result<(), String> {
    let main_window = app
        .get_webview_window("main")
        .ok_or("Main window not found")?;

    main_window
        .set_focus()
        .map_err(|e| format!("Failed to focus main: {}", e))?;

    Ok(())
}

/// Setzt Web-Tab in Fullscreen-Modus
#[tauri::command]
async fn set_web_tab_fullscreen(
    app: tauri::AppHandle,
    state: tauri::State<'_, Mutex<WebTabState>>,
    tab_id: String,
    fullscreen: bool,
) -> Result<(), String> {
    let webview = app
        .get_webview_window(&tab_id)
        .ok_or("Web tab not found")?;

    let main_window = app
        .get_webview_window("main")
        .ok_or("Main window not found")?;

    if fullscreen {
        // Aktuelle Bounds speichern
        let current_pos = webview.outer_position().unwrap_or(PhysicalPosition::new(0, 0));
        let current_size = webview.outer_size().unwrap_or(PhysicalSize::new(800, 600));
        let main_pos = main_window.outer_position().unwrap_or(PhysicalPosition::new(0, 0));

        {
            let mut tab_state = state.lock().unwrap();
            if let Some(tab) = tab_state.tabs.get_mut(&tab_id) {
                tab.saved_bounds = Some(TabBounds {
                    x: current_pos.x - main_pos.x,
                    y: current_pos.y - main_pos.y,
                    width: current_size.width,
                    height: current_size.height,
                });
                tab.is_fullscreen = true;
            }
        }

        // Hauptfenster-Größe für Fullscreen
        let main_size = main_window.outer_size().unwrap_or(PhysicalSize::new(1200, 800));
        let main_pos = main_window.outer_position().unwrap_or(PhysicalPosition::new(0, 0));

        webview.set_position(main_pos).ok();
        webview.set_size(main_size).ok();
        webview.set_focus().ok();
    } else {
        // Zurück zur gespeicherten Position
        let saved_bounds = {
            let mut tab_state = state.lock().unwrap();
            if let Some(tab) = tab_state.tabs.get_mut(&tab_id) {
                tab.is_fullscreen = false;
                tab.saved_bounds.take()
            } else {
                None
            }
        };

        if let Some(bounds) = saved_bounds {
            let main_pos = main_window.outer_position().unwrap_or(PhysicalPosition::new(0, 0));
            webview.set_position(PhysicalPosition::new(
                main_pos.x + bounds.x,
                main_pos.y + bounds.y,
            )).ok();
            webview.set_size(PhysicalSize::new(bounds.width, bounds.height)).ok();
        }
    }

    // Event senden
    app.emit("web-tab-fullscreen", serde_json::json!({
        "tab_id": tab_id,
        "fullscreen": fullscreen,
    })).ok();

    Ok(())
}

/// Schließt einen Web-Tab
#[tauri::command]
async fn close_web_tab(
    app: tauri::AppHandle,
    state: tauri::State<'_, Mutex<WebTabState>>,
    tab_id: String,
) -> Result<(), String> {
    // Aus State entfernen
    {
        let mut tab_state = state.lock().unwrap();
        tab_state.tabs.remove(&tab_id);
    }

    // Window schließen
    if let Some(webview) = app.get_webview_window(&tab_id) {
        webview.close().map_err(|e| format!("Failed to close: {}", e))?;
    }

    Ok(())
}

/// Versteckt einen Web-Tab (z.B. beim Zoomen)
#[tauri::command]
async fn set_web_tab_visible(
    app: tauri::AppHandle,
    tab_id: String,
    visible: bool,
) -> Result<(), String> {
    let webview = app
        .get_webview_window(&tab_id)
        .ok_or("Web tab not found")?;

    if visible {
        webview.show().map_err(|e| format!("Failed to show: {}", e))?;
    } else {
        webview.hide().map_err(|e| format!("Failed to hide: {}", e))?;
    }

    Ok(())
}

/// Navigiert zu einer neuen URL
#[tauri::command]
async fn navigate_web_tab(
    app: tauri::AppHandle,
    state: tauri::State<'_, Mutex<WebTabState>>,
    tab_id: String,
    url: String,
) -> Result<(), String> {
    let webview = app
        .get_webview_window(&tab_id)
        .ok_or("Web tab not found")?;

    let parsed_url: tauri::Url = url.parse().map_err(|e| format!("Invalid URL: {}", e))?;
    
    webview
        .navigate(parsed_url)
        .map_err(|e| format!("Failed to navigate: {}", e))?;

    // URL in State aktualisieren
    {
        let mut tab_state = state.lock().unwrap();
        if let Some(tab) = tab_state.tabs.get_mut(&tab_id) {
            tab.url = url;
        }
    }

    Ok(())
}

/// Prüft ob ein Tab im Fullscreen ist
#[tauri::command]
fn is_web_tab_fullscreen(
    state: tauri::State<'_, Mutex<WebTabState>>,
    tab_id: String,
) -> bool {
    let tab_state = state.lock().unwrap();
    tab_state.tabs.get(&tab_id).map(|t| t.is_fullscreen).unwrap_or(false)
}

/// Schließt alle offenen Web-Tabs
#[tauri::command]
async fn close_all_web_tabs(
    app: tauri::AppHandle,
    state: tauri::State<'_, Mutex<WebTabState>>,
) -> Result<(), String> {
    let tab_ids: Vec<String> = {
        let tab_state = state.lock().unwrap();
        tab_state.tabs.keys().cloned().collect()
    };

    for tab_id in tab_ids {
        // Aus State entfernen
        {
            let mut tab_state = state.lock().unwrap();
            tab_state.tabs.remove(&tab_id);
        }
        // Window schließen
        if let Some(webview) = app.get_webview_window(&tab_id) {
            webview.close().ok();
        }
    }

    Ok(())
}

/// Schließt alle verwaisten Webview-Fenster (die nicht im State sind)
#[tauri::command]
async fn close_all_orphaned_webviews(
    app: tauri::AppHandle,
    state: tauri::State<'_, Mutex<WebTabState>>,
) -> Result<u32, String> {
    let known_tab_ids: HashSet<String> = {
        let tab_state = state.lock().unwrap();
        tab_state.tabs.keys().cloned().collect()
    };

    let mut closed_count = 0;
    
    // Alle Webview-Fenster durchgehen
    for window in app.webview_windows().values() {
        let window_label = window.label();
        
        // Nur Fenster schließen die mit "webtab-" beginnen (unsere Web-Tabs)
        // aber nicht "main" sind und nicht im State sind
        if window_label.starts_with("webtab-") && !known_tab_ids.contains(window_label) {
            window.close().ok();
            closed_count += 1;
        }
    }

    Ok(closed_count)
}

// ============================================================================
// LEGACY COMMANDS (für Kompatibilität)
// ============================================================================

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

// ============================================================================
// APP ENTRY
// ============================================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Mutex::new(WebTabState {
            tabs: HashMap::new(),
        }))
        .invoke_handler(tauri::generate_handler![
            // Legacy
            greet,
            open_webview_window,
            close_webview_window,
            // Web Tab API
            create_web_tab,
            update_web_tab_bounds,
            focus_web_tab,
            unfocus_web_tabs,
            set_web_tab_fullscreen,
            close_web_tab,
            close_all_web_tabs,
            close_all_orphaned_webviews,
            set_web_tab_visible,
            navigate_web_tab,
            is_web_tab_fullscreen,
        ])
        .setup(|app| {
            // Beim App-Start alle verwaisten Webview-Fenster schließen
            let app_handle = app.handle().clone();
            
            // Cleanup nach kurzer Verzögerung (damit alle Fenster initialisiert sind)
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(500));
                
                // State aus AppHandle holen
                let known_tab_ids: HashSet<String> = {
                    if let Some(state) = app_handle.try_state::<Mutex<WebTabState>>() {
                        let tab_state = state.lock().unwrap();
                        tab_state.tabs.keys().cloned().collect()
                    } else {
                        HashSet::new()
                    }
                };
                
                // Alle Webview-Fenster durchgehen
                for window in app_handle.webview_windows().values() {
                    let window_label = window.label();
                    
                    // Nur Fenster schließen die mit "webtab-" beginnen (unsere Web-Tabs)
                    // aber nicht "main" sind und nicht im State sind
                    if window_label.starts_with("webtab-") && !known_tab_ids.contains(window_label) {
                        window.close().ok();
                    }
                }
            });
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
