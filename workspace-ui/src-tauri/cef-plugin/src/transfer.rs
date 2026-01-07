//! Frame Transfer - Efficient transfer of frame data to frontend
//!
//! This module handles the transfer of rendered frames from CEF to the frontend.
//! We use raw byte arrays that can be efficiently uploaded to WebGL textures.

use crate::FrameData;

/// Compress frame data for transfer (optional, can be disabled for speed)
pub fn compress_frame(_frame: &FrameData) -> Vec<u8> {
    // For now, we just return raw BGRA data
    // In the future, we could use LZ4 or similar for compression
    _frame.data.clone()
}

/// Convert BGRA to RGBA for WebGL compatibility
pub fn bgra_to_rgba(data: &mut [u8]) {
    for chunk in data.chunks_exact_mut(4) {
        chunk.swap(0, 2); // Swap B and R
    }
}

/// Batch frame data for efficient transfer
pub struct FrameBatch {
    pub frames: Vec<FrameData>,
    pub total_bytes: usize,
}

impl FrameBatch {
    pub fn new() -> Self {
        Self {
            frames: Vec::new(),
            total_bytes: 0,
        }
    }

    pub fn add(&mut self, frame: FrameData) {
        self.total_bytes += frame.data.len();
        self.frames.push(frame);
    }

    pub fn is_empty(&self) -> bool {
        self.frames.is_empty()
    }
}

/// Dirty rect tracking for partial updates
#[derive(Debug, Clone)]
pub struct DirtyRect {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

impl DirtyRect {
    pub fn full(width: u32, height: u32) -> Self {
        Self {
            x: 0,
            y: 0,
            width,
            height,
        }
    }

    /// Merge two dirty rects into one that covers both
    pub fn merge(&self, other: &DirtyRect) -> DirtyRect {
        let x = self.x.min(other.x);
        let y = self.y.min(other.y);
        let right = (self.x + self.width).max(other.x + other.width);
        let bottom = (self.y + self.height).max(other.y + other.height);

        DirtyRect {
            x,
            y,
            width: right - x,
            height: bottom - y,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bgra_to_rgba() {
        let mut data = vec![
            0, 128, 255, 255, // BGRA: Blue=0, Green=128, Red=255, Alpha=255
        ];
        bgra_to_rgba(&mut data);
        assert_eq!(data, vec![255, 128, 0, 255]); // RGBA
    }

    #[test]
    fn test_dirty_rect_merge() {
        let a = DirtyRect { x: 0, y: 0, width: 100, height: 100 };
        let b = DirtyRect { x: 50, y: 50, width: 100, height: 100 };
        let merged = a.merge(&b);

        assert_eq!(merged.x, 0);
        assert_eq!(merged.y, 0);
        assert_eq!(merged.width, 150);
        assert_eq!(merged.height, 150);
    }
}
