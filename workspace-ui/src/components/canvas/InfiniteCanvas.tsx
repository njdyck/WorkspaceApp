import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { useCanvasStore, useWebTabStore, useUIStore } from '@/stores';
import { useCanvasNavigation, useSelection, useItemDrag, useItemResize } from '@/hooks';
import { CanvasGrid } from './CanvasGrid';
import { CanvasItem } from './CanvasItem';
import { WebTabItem } from './WebTabItem';
import { SelectionRect } from './SelectionRect';
import { ProximityFeedback } from './ProximityFeedback';
import { ConnectionLines } from './ConnectionLines';
import { CanvasViewport } from './CanvasViewport';
import { FocusZone } from './FocusZone';

export const InfiniteCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);

  // Granulare Zustand-Selektoren für bessere Performance
  const items = useCanvasStore((s) => s.items);
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

  // Memoized items array - nur neu berechnen wenn sich items Map ändert
  const itemsArray = useMemo(() => Array.from(items.values()), [items]);

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

        {/* Items - WebTabItem für webview badges, sonst CanvasItem */}
        {itemsArray.map((item) => 
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
