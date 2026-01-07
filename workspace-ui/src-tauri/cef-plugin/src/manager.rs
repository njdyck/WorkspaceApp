//! Browser Manager - Manages multiple CEF browser instances

use crate::{BrowserInfo, CefBounds, FrameData, KeyEvent, MouseEvent};
use crate::renderer::OsrBrowserInstance;
use dashmap::DashMap;
use std::sync::Arc;

/// Manages multiple CEF browser instances with off-screen rendering
pub struct BrowserManager {
    browsers: Arc<DashMap<String, OsrBrowserInstance>>,
    cef_initialized: bool,
}

impl BrowserManager {
    /// Create a new BrowserManager and initialize CEF
    pub fn new() -> Result<Self, String> {
        // TODO: Initialize CEF here
        // For now, we'll create a stub that can be filled in

        log::info!("Initializing CEF BrowserManager...");

        Ok(Self {
            browsers: Arc::new(DashMap::new()),
            cef_initialized: true,
        })
    }

    /// Shutdown CEF and cleanup all browsers
    pub fn shutdown(self) {
        log::info!("Shutting down CEF BrowserManager...");

        // Close all browsers
        for entry in self.browsers.iter() {
            let _ = entry.value().close();
        }
        self.browsers.clear();

        // TODO: Call cef::shutdown()
    }

    /// Create a new browser instance
    pub fn create_browser(
        &self,
        id: &str,
        url: &str,
        bounds: CefBounds,
    ) -> Result<(), String> {
        if self.browsers.contains_key(id) {
            return Err(format!("Browser '{}' already exists", id));
        }

        let browser = OsrBrowserInstance::new(id, url, bounds)?;
        self.browsers.insert(id.to_string(), browser);

        log::info!("Created browser: {} -> {}", id, url);
        Ok(())
    }

    /// Close a browser instance
    pub fn close_browser(&self, id: &str) -> Result<(), String> {
        if let Some((_, browser)) = self.browsers.remove(id) {
            browser.close()?;
            log::info!("Closed browser: {}", id);
            Ok(())
        } else {
            Err(format!("Browser '{}' not found", id))
        }
    }

    /// Update browser bounds (triggers resize)
    pub fn update_bounds(&self, id: &str, bounds: CefBounds) -> Result<(), String> {
        if let Some(mut browser) = self.browsers.get_mut(id) {
            browser.update_bounds(bounds)?;
            Ok(())
        } else {
            Err(format!("Browser '{}' not found", id))
        }
    }

    /// Navigate to a URL
    pub fn navigate(&self, id: &str, url: &str) -> Result<(), String> {
        if let Some(browser) = self.browsers.get(id) {
            browser.navigate(url)?;
            log::info!("Navigate browser {} to: {}", id, url);
            Ok(())
        } else {
            Err(format!("Browser '{}' not found", id))
        }
    }

    /// Get the latest frame for a browser
    pub fn get_frame(&self, id: &str) -> Option<FrameData> {
        self.browsers.get(id).and_then(|b| b.get_frame())
    }

    /// Get frames for all browsers (batch)
    pub fn get_all_frames(&self) -> Vec<FrameData> {
        self.browsers
            .iter()
            .filter_map(|entry| entry.value().get_frame())
            .collect()
    }

    /// Send mouse event to browser
    pub fn send_mouse_event(&self, id: &str, event: MouseEvent) -> Result<(), String> {
        if let Some(browser) = self.browsers.get(id) {
            browser.send_mouse_event(event)?;
            Ok(())
        } else {
            Err(format!("Browser '{}' not found", id))
        }
    }

    /// Send keyboard event to browser
    pub fn send_key_event(&self, id: &str, event: KeyEvent) -> Result<(), String> {
        if let Some(browser) = self.browsers.get(id) {
            browser.send_key_event(event)?;
            Ok(())
        } else {
            Err(format!("Browser '{}' not found", id))
        }
    }

    /// Focus a browser for keyboard input
    pub fn focus_browser(&self, id: &str) -> Result<(), String> {
        // Unfocus all others first
        for entry in self.browsers.iter() {
            if entry.key() != id {
                let _ = entry.value().set_focus(false);
            }
        }

        // Focus the target
        if let Some(browser) = self.browsers.get(id) {
            browser.set_focus(true)?;
            Ok(())
        } else {
            Err(format!("Browser '{}' not found", id))
        }
    }

    /// List all browsers
    pub fn list_browsers(&self) -> Vec<BrowserInfo> {
        self.browsers
            .iter()
            .map(|entry| entry.value().get_info())
            .collect()
    }
}
