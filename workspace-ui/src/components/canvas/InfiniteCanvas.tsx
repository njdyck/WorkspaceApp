import React, { useRef, useEffect } from 'react';
import { useCanvasStore } from '@/stores';
import { useCanvasNavigation, useSelection, useItemDrag, useItemResize } from '@/hooks';
import { CanvasGrid } from './CanvasGrid';
import { CanvasItem } from './CanvasItem';
import { SelectionRect } from './SelectionRect';
import { ProximityFeedback } from './ProximityFeedback';
import { ConnectionLines } from './ConnectionLines';
import { CanvasViewport } from './CanvasViewport';

export const InfiniteCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const { items, clearSelection, isPanning, isConnecting, cancelConnecting } = useCanvasStore();
  const { isModifierPressed, handlers: navHandlers } = useCanvasNavigation();
  const { isSelecting, startSelection, updateSelection, endSelection } = useSelection();
  
  useItemDrag();
  useItemResize();

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

  const handleMouseDown = (e: React.MouseEvent) => {
    // Im Verbindungsmodus: Klick auf leeren Bereich bricht ab
    if (isConnecting) {
      cancelConnecting();
      return;
    }
    
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

  const getCursor = () => {
    if (isPanning) return 'grabbing';
    if (isModifierPressed) return 'grab';
    if (isConnecting) return 'crosshair';
    if (isSelecting) return 'crosshair';
    return 'default';
  };

  const itemsArray = Array.from(items.values());

  return (
    <div
      ref={canvasRef}
      className="flex-1 bg-gray-50 relative overflow-hidden h-full touch-none"
      style={{ cursor: getCursor() }}
      onWheel={navHandlers.onWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Container that handles Pan & Zoom for EVERYTHING */}
      <CanvasViewport>
        <CanvasGrid />
        
        {/* Visual Feedback Layer */}
        <ProximityFeedback />
        
        {/* Explizite Verbindungen */}
        <ConnectionLines />
        
        {/* Items */}
        {itemsArray.map((item) => (
          <CanvasItem key={item.id} item={item} />
        ))}

        <SelectionRect />
      </CanvasViewport>
    </div>
  );
};
