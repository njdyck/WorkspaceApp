import React, { useCallback, useRef, useEffect } from 'react';
import { useUIStore, useCanvasStore } from '@/stores';
import { X, Move } from 'lucide-react';

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

export const FocusZone: React.FC = () => {
  const focusMode = useUIStore((s) => s.focusMode);
  const focusZone = useUIStore((s) => s.focusZone);
  const updateFocusZone = useUIStore((s) => s.updateFocusZone);
  const exitFocusMode = useUIStore((s) => s.exitFocusMode);
  const viewport = useCanvasStore((s) => s.viewport);

  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const resizeHandle = useRef<ResizeHandle | null>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const startZone = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // Handle dragging
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!focusZone) return;

    isDragging.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    startZone.current = { ...focusZone };
  }, [focusZone]);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent, handle: ResizeHandle) => {
    e.stopPropagation();
    e.preventDefault();
    if (!focusZone) return;

    isResizing.current = true;
    resizeHandle.current = handle;
    startPos.current = { x: e.clientX, y: e.clientY };
    startZone.current = { ...focusZone };
  }, [focusZone]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!focusZone) return;

      const deltaX = (e.clientX - startPos.current.x) / viewport.scale;
      const deltaY = (e.clientY - startPos.current.y) / viewport.scale;

      if (isDragging.current) {
        updateFocusZone({
          x: startZone.current.x + deltaX,
          y: startZone.current.y + deltaY,
        });
      } else if (isResizing.current && resizeHandle.current) {
        const handle = resizeHandle.current;
        let newX = startZone.current.x;
        let newY = startZone.current.y;
        let newWidth = startZone.current.width;
        let newHeight = startZone.current.height;

        // Handle horizontal resize
        if (handle.includes('e')) {
          newWidth = Math.max(200, startZone.current.width + deltaX);
        }
        if (handle.includes('w')) {
          const widthChange = Math.min(deltaX, startZone.current.width - 200);
          newX = startZone.current.x + widthChange;
          newWidth = startZone.current.width - widthChange;
        }

        // Handle vertical resize
        if (handle.includes('s')) {
          newHeight = Math.max(150, startZone.current.height + deltaY);
        }
        if (handle.includes('n')) {
          const heightChange = Math.min(deltaY, startZone.current.height - 150);
          newY = startZone.current.y + heightChange;
          newHeight = startZone.current.height - heightChange;
        }

        updateFocusZone({ x: newX, y: newY, width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      isResizing.current = false;
      resizeHandle.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [focusZone, viewport.scale, updateFocusZone]);

  if (!focusMode || !focusZone) return null;

  const handleStyle = 'absolute w-3 h-3 bg-amber-400 border-2 border-amber-600 rounded-sm z-30';

  return (
    <>
      {/* Dimmer overlay - covers everything outside the zone */}
      <FocusZoneDimmer zone={focusZone} />

      {/* Focus Zone Frame */}
      <div
        className="absolute pointer-events-none z-20"
        style={{
          left: focusZone.x,
          top: focusZone.y,
          width: focusZone.width,
          height: focusZone.height,
        }}
      >
        {/* Border glow effect */}
        <div
          className="absolute inset-0 border-2 border-amber-400 rounded-lg shadow-lg"
          style={{
            boxShadow: '0 0 20px rgba(251, 191, 36, 0.3), inset 0 0 20px rgba(251, 191, 36, 0.05)'
          }}
        />

        {/* Header bar for dragging */}
        <div
          className="absolute -top-8 left-0 right-0 h-7 bg-amber-400/90 rounded-t-lg flex items-center justify-between px-2 pointer-events-auto cursor-move"
          onMouseDown={handleDragStart}
        >
          <div className="flex items-center gap-1.5 text-amber-900 text-xs font-medium">
            <Move size={12} />
            <span>Focus Zone</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); exitFocusMode(); }}
            className="p-0.5 hover:bg-amber-500/50 rounded transition-colors"
          >
            <X size={14} className="text-amber-900" />
          </button>
        </div>

        {/* Resize Handles */}
        {/* Corners */}
        <div
          className={`${handleStyle} -top-1.5 -left-1.5 cursor-nw-resize pointer-events-auto`}
          onMouseDown={(e) => handleResizeStart(e, 'nw')}
        />
        <div
          className={`${handleStyle} -top-1.5 -right-1.5 cursor-ne-resize pointer-events-auto`}
          onMouseDown={(e) => handleResizeStart(e, 'ne')}
        />
        <div
          className={`${handleStyle} -bottom-1.5 -left-1.5 cursor-sw-resize pointer-events-auto`}
          onMouseDown={(e) => handleResizeStart(e, 'sw')}
        />
        <div
          className={`${handleStyle} -bottom-1.5 -right-1.5 cursor-se-resize pointer-events-auto`}
          onMouseDown={(e) => handleResizeStart(e, 'se')}
        />

        {/* Edges */}
        <div
          className={`${handleStyle} -top-1.5 left-1/2 -translate-x-1/2 cursor-n-resize pointer-events-auto`}
          onMouseDown={(e) => handleResizeStart(e, 'n')}
        />
        <div
          className={`${handleStyle} -bottom-1.5 left-1/2 -translate-x-1/2 cursor-s-resize pointer-events-auto`}
          onMouseDown={(e) => handleResizeStart(e, 's')}
        />
        <div
          className={`${handleStyle} top-1/2 -left-1.5 -translate-y-1/2 cursor-w-resize pointer-events-auto`}
          onMouseDown={(e) => handleResizeStart(e, 'w')}
        />
        <div
          className={`${handleStyle} top-1/2 -right-1.5 -translate-y-1/2 cursor-e-resize pointer-events-auto`}
          onMouseDown={(e) => handleResizeStart(e, 'e')}
        />
      </div>
    </>
  );
};

// Separate component for the dimmer overlay
const FocusZoneDimmer: React.FC<{ zone: { x: number; y: number; width: number; height: number } }> = ({ zone }) => {
  // Use CSS clip-path to create a "hole" in the dimmer
  // This creates 4 rectangles around the focus zone
  const padding = 10000; // Large enough to cover any canvas size

  return (
    <div className="absolute pointer-events-none z-15" style={{
      left: -padding,
      top: -padding,
      width: padding * 2 + zone.width + zone.x * 2,
      height: padding * 2 + zone.height + zone.y * 2,
    }}>
      {/* Top dim area */}
      <div
        className="absolute bg-black/40 dark:bg-black/60 transition-colors"
        style={{
          left: 0,
          top: 0,
          right: 0,
          height: zone.y + padding,
        }}
      />
      {/* Bottom dim area */}
      <div
        className="absolute bg-black/40 dark:bg-black/60 transition-colors"
        style={{
          left: 0,
          top: zone.y + zone.height + padding,
          right: 0,
          bottom: 0,
        }}
      />
      {/* Left dim area */}
      <div
        className="absolute bg-black/40 dark:bg-black/60 transition-colors"
        style={{
          left: 0,
          top: zone.y + padding,
          width: zone.x + padding,
          height: zone.height,
        }}
      />
      {/* Right dim area */}
      <div
        className="absolute bg-black/40 dark:bg-black/60 transition-colors"
        style={{
          left: zone.x + zone.width + padding,
          top: zone.y + padding,
          right: 0,
          height: zone.height,
        }}
      />
    </div>
  );
};

export default FocusZone;
