//! OSR Browser Instance - Individual browser with off-screen rendering

use crate::{BrowserInfo, CefBounds, FrameData, KeyEvent, MouseEvent};
use parking_lot::RwLock;
use std::sync::Arc;

/// Frame buffer for storing rendered content
struct FrameBuffer {
    data: Vec<u8>,
    width: u32,
    height: u32,
    dirty: bool,
}

impl FrameBuffer {
    fn new(width: u32, height: u32) -> Self {
        let size = (width * height * 4) as usize; // BGRA
        Self {
            data: vec![0u8; size],
            width,
            height,
            dirty: false,
        }
    }

    fn resize(&mut self, width: u32, height: u32) {
        let size = (width * height * 4) as usize;
        self.data.resize(size, 0);
        self.width = width;
        self.height = height;
        self.dirty = true;
    }

    fn update(&mut self, buffer: &[u8], width: u32, height: u32) {
        if self.width != width || self.height != height {
            self.resize(width, height);
        }
        let size = (width * height * 4) as usize;
        if buffer.len() >= size {
            self.data[..size].copy_from_slice(&buffer[..size]);
            self.dirty = true;
        }
    }

    fn take_if_dirty(&mut self) -> Option<(Vec<u8>, u32, u32)> {
        if self.dirty {
            self.dirty = false;
            Some((self.data.clone(), self.width, self.height))
        } else {
            None
        }
    }
}

/// Single CEF browser instance with off-screen rendering
pub struct OsrBrowserInstance {
    id: String,
    url: String,
    bounds: RwLock<CefBounds>,
    frame_buffer: Arc<RwLock<FrameBuffer>>,
    is_loading: RwLock<bool>,
    is_focused: RwLock<bool>,
    // TODO: Add actual CEF browser handle
    // browser: Option<cef::Browser>,
}

impl OsrBrowserInstance {
    /// Create a new browser instance
    pub fn new(id: &str, url: &str, bounds: CefBounds) -> Result<Self, String> {
        let width = bounds.width.max(100) as u32;
        let height = bounds.height.max(100) as u32;

        let instance = Self {
            id: id.to_string(),
            url: url.to_string(),
            bounds: RwLock::new(bounds),
            frame_buffer: Arc::new(RwLock::new(FrameBuffer::new(width, height))),
            is_loading: RwLock::new(true),
            is_focused: RwLock::new(false),
        };

        // TODO: Create actual CEF browser with off-screen rendering
        // This would involve:
        // 1. Create WindowInfo with windowless_rendering_enabled = true
        // 2. Create BrowserSettings with windowless_frame_rate = 60
        // 3. Create RenderHandler that captures OnPaint callbacks
        // 4. Create browser via browser_host_create_browser_sync

        // For now, we'll generate a placeholder frame
        instance.generate_placeholder_frame();

        Ok(instance)
    }

    /// Generate a placeholder frame (for testing before CEF is fully integrated)
    fn generate_placeholder_frame(&self) {
        let bounds = self.bounds.read();
        let width = bounds.width.max(100) as u32;
        let height = bounds.height.max(100) as u32;
        drop(bounds);

        let mut buffer = self.frame_buffer.write();

        // Fill with a gradient (placeholder)
        buffer.resize(width, height);
        for y in 0..height {
            for x in 0..width {
                let idx = ((y * width + x) * 4) as usize;
                if idx + 3 < buffer.data.len() {
                    // BGRA format
                    buffer.data[idx] = ((x * 255 / width) as u8);     // B
                    buffer.data[idx + 1] = ((y * 255 / height) as u8); // G
                    buffer.data[idx + 2] = 100;                         // R
                    buffer.data[idx + 3] = 255;                         // A
                }
            }
        }
        buffer.dirty = true;
    }

    /// Close the browser
    pub fn close(&self) -> Result<(), String> {
        // TODO: Close actual CEF browser
        log::info!("Closing browser: {}", self.id);
        Ok(())
    }

    /// Update bounds (resize)
    pub fn update_bounds(&mut self, bounds: CefBounds) -> Result<(), String> {
        let width = bounds.width.max(100) as u32;
        let height = bounds.height.max(100) as u32;

        *self.bounds.write() = bounds;

        // Resize frame buffer
        self.frame_buffer.write().resize(width, height);

        // TODO: Notify CEF browser of resize via host.was_resized()

        // Regenerate placeholder for now
        self.generate_placeholder_frame();

        Ok(())
    }

    /// Navigate to URL
    pub fn navigate(&self, url: &str) -> Result<(), String> {
        // TODO: Call browser.get_main_frame().load_url(url)
        log::info!("Navigate {} to: {}", self.id, url);
        Ok(())
    }

    /// Get the latest frame if dirty
    pub fn get_frame(&self) -> Option<FrameData> {
        let mut buffer = self.frame_buffer.write();
        buffer.take_if_dirty().map(|(data, width, height)| FrameData {
            browser_id: self.id.clone(),
            width,
            height,
            format: "BGRA8".to_string(),
            data,
        })
    }

    /// Send mouse event
    pub fn send_mouse_event(&self, event: MouseEvent) -> Result<(), String> {
        // TODO: Forward to CEF via browser.host().send_mouse_*_event()
        log::trace!("Mouse event on {}: {:?}", self.id, event.event_type);
        Ok(())
    }

    /// Send keyboard event
    pub fn send_key_event(&self, event: KeyEvent) -> Result<(), String> {
        // TODO: Forward to CEF via browser.host().send_key_event()
        log::trace!("Key event on {}: {:?}", self.id, event.event_type);
        Ok(())
    }

    /// Set focus state
    pub fn set_focus(&self, focused: bool) -> Result<(), String> {
        *self.is_focused.write() = focused;
        // TODO: Call browser.host().set_focus(focused)
        Ok(())
    }

    /// Get browser info
    pub fn get_info(&self) -> BrowserInfo {
        BrowserInfo {
            id: self.id.clone(),
            url: self.url.clone(),
            bounds: self.bounds.read().clone(),
            is_loading: *self.is_loading.read(),
        }
    }
}

// ============================================================================
// CEF RENDER HANDLER (to be implemented with actual CEF)
// ============================================================================

/*
This is pseudocode for the actual CEF integration:

use cef::{RenderHandler, Browser, Rect, PaintElementType};

pub struct OsrRenderHandler {
    frame_buffer: Arc<RwLock<FrameBuffer>>,
}

impl RenderHandler for OsrRenderHandler {
    fn view_rect(&self, browser: &Browser, rect: &mut Rect) {
        // Return the current view size
        let bounds = self.bounds.read();
        rect.width = bounds.width;
        rect.height = bounds.height;
    }

    fn on_paint(
        &self,
        browser: &Browser,
        type_: PaintElementType,
        dirty_rects: &[Rect],
        buffer: *const u8,
        width: i32,
        height: i32,
    ) {
        // Copy the rendered buffer to our frame buffer
        let buffer_size = (width * height * 4) as usize;
        let buffer_slice = unsafe { std::slice::from_raw_parts(buffer, buffer_size) };

        self.frame_buffer.write().update(buffer_slice, width as u32, height as u32);
    }
}
*/
