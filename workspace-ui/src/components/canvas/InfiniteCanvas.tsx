import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { useCanvasStore, useWebTabStore, useUIStore } from '@/stores';
import { useCanvasNavigation, useSelection, useItemDrag, useItemResize, useFileDrop } from '@/hooks';
import { CanvasGrid } from './CanvasGrid';
import { CanvasItem } from './CanvasItem';
import { WebTabItem } from './WebTabItem';
import { SelectionRect } from './SelectionRect';
import { ProximityFeedback } from './ProximityFeedback';
import { ConnectionLines } from './ConnectionLines';
import { CanvasViewport } from './CanvasViewport';
import { FocusZone } from './FocusZone';
import { CanvasItem as CanvasItemType } from '@/models';

// Viewport culling buffer - items within this margin of viewport are rendered
const CULLING_BUFFER = 200;

// Check if item is visible in viewport (with buffer)
function isItemInViewport(
  item: CanvasItemType,
  viewport: { x: number; y: number; scale: number },
  windowWidth: number,
  windowHeight: number
): boolean {
  // Convert viewport coordinates to canvas coordinates
  const viewLeft = -viewport.x / viewport.scale - CULLING_BUFFER;
  const viewTop = -viewport.y / viewport.scale - CULLING_BUFFER;
  const viewRight = (-viewport.x + windowWidth) / viewport.scale + CULLING_BUFFER;
  const viewBottom = (-viewport.y + windowHeight) / viewport.scale + CULLING_BUFFER;

  // Check if item intersects with viewport
  const itemRight = item.x + item.width;
  const itemBottom = item.y + item.height;

  return !(
    item.x > viewRight ||
    itemRight < viewLeft ||
    item.y > viewBottom ||
    itemBottom < viewTop
  );
}

export const InfiniteCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);

  // Granulare Zustand-Selektoren für bessere Performance
  const items = useCanvasStore((s) => s.items);
  const viewport = useCanvasStore((s) => s.viewport);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const isPanning = useCanvasStore((s) => s.isPanning);
  const isConnecting = useCanvasStore((s) => s.isConnecting);
  const cancelConnecting = useCanvasStore((s) => s.cancelConnecting);
  const boardId = useCanvasStore((s) => s.boardId);

  const openContextMenu = useUIStore((s) => s.openContextMenu);
  const closeContextMenu = useUIStore((s) => s.closeContextMenu);
  const { isModifierPressed, handlers: navHandlers } = useCanvasNavigation();
  const { isSelecting, startSelection, updateSelection, endSelection } = useSelection();
  const { closeAllTabs } = useWebTabStore();
  
  useItemDrag();
  useItemResize();
  useFileDrop(); // Native OS File Drag-and-Drop

  // Schließe alle Tabs beim Board-Wechsel
  useEffect(() => {
    closeAllTabs();
  }, [boardId, closeAllTabs]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
        }
    };
    
    let passiveSupported = false;
    try {
        const options = Object.defineProperty({}, "passive", {
            get: function() { passiveSupported = true; }
        });
        window.addEventListener("test", null as any, options);
    } catch(err) {}

    el.addEventListener('wheel', onWheel, passiveSupported ? { passive: false } : false);
    
    return () => {
        el.removeEventListener('wheel', onWheel);
    };
  }, []);

  const { unfocusAllTabs } = useWebTabStore();

  const handleMouseDown = (e: React.MouseEvent) => {
    // Im Verbindungsmodus: Klick auf leeren Bereich bricht ab
    if (isConnecting) {
      cancelConnecting();
      return;
    }
    
    // Unfocus alle Web-Tabs wenn auf Canvas geklickt
    unfocusAllTabs();
    
    navHandlers.onMouseDown(e);
    if (!isModifierPressed) {
      const started = startSelection(e, canvasRef.current);
      if (!started) {
        clearSelection();
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isSelecting) {
      updateSelection(e, canvasRef.current);
    }
  };

  const handleMouseUp = () => {
    endSelection();
  };

  // Context Menu Handler
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    closeContextMenu(); // Close any existing menu first
    openContextMenu(e.clientX, e.clientY, null); // null = canvas context menu
  }, [openContextMenu, closeContextMenu]);

  const getCursor = () => {
    if (isPanning) return 'grabbing';
    if (isModifierPressed) return 'grab';
    if (isConnecting) return 'crosshair';
    if (isSelecting) return 'crosshair';
    return 'default';
  };

  // Memoized visible items - viewport culling for performance
  const visibleItems = useMemo(() => {
    const allItems = Array.from(items.values());
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    return allItems.filter(item =>
      isItemInViewport(item, viewport, windowWidth, windowHeight)
    );
  }, [items, viewport.x, viewport.y, viewport.scale]);

  return (
    <div
      ref={canvasRef}
      className="flex-1 bg-gray-50 dark:bg-gray-900 relative overflow-hidden h-full touch-none transition-colors"
      style={{ cursor: getCursor() }}
      onWheel={navHandlers.onWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
    >
      {/* Container that handles Pan & Zoom for EVERYTHING */}
      <CanvasViewport>
        <CanvasGrid />
        
        {/* Visual Feedback Layer */}
        <ProximityFeedback />
        
        {/* Explizite Verbindungen */}
        <ConnectionLines />

        {/* Focus Zone - Dimmer und Rahmen */}
        <FocusZone />

        {/* Items - Only render visible items (viewport culling) */}
        {visibleItems.map((item) =>
          item.badge === 'webview' ? (
            <WebTabItem key={item.id} item={item} />
          ) : (
            <CanvasItem key={item.id} item={item} />
          )
        )}

        <SelectionRect />
      </CanvasViewport>
    </div>
  );
};
