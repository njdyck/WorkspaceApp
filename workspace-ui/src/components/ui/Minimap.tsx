import React, { useMemo, useCallback, useRef } from 'react';
import { useCanvasStore, useUIStore } from '@/stores';

const MINIMAP_WIDTH = 180;
const MINIMAP_HEIGHT = 120;
const MINIMAP_PADDING = 10;

export const Minimap: React.FC = () => {
  const showMinimap = useUIStore((s) => s.showMinimap);
  const items = useCanvasStore((s) => s.items);
  const viewport = useCanvasStore((s) => s.viewport);
  const setViewport = useCanvasStore((s) => s.setViewport);

  const minimapRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Calculate bounds of all items
  const bounds = useMemo(() => {
    const itemsArray = Array.from(items.values());
    if (itemsArray.length === 0) {
      return { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    itemsArray.forEach((item) => {
      minX = Math.min(minX, item.x);
      minY = Math.min(minY, item.y);
      maxX = Math.max(maxX, item.x + item.width);
      maxY = Math.max(maxY, item.y + item.height);
    });

    // Add padding
    const padding = 100;
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding,
    };
  }, [items]);

  // Calculate scale to fit all items in minimap
  const minimapScale = useMemo(() => {
    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;
    const scaleX = (MINIMAP_WIDTH - MINIMAP_PADDING * 2) / contentWidth;
    const scaleY = (MINIMAP_HEIGHT - MINIMAP_PADDING * 2) / contentHeight;
    return Math.min(scaleX, scaleY, 0.1);
  }, [bounds]);

  // Calculate viewport rectangle in minimap coordinates
  const viewportRect = useMemo(() => {
    const viewWidth = window.innerWidth / viewport.scale;
    const viewHeight = window.innerHeight / viewport.scale;
    const viewX = -viewport.x / viewport.scale;
    const viewY = -viewport.y / viewport.scale;

    return {
      x: (viewX - bounds.minX) * minimapScale + MINIMAP_PADDING,
      y: (viewY - bounds.minY) * minimapScale + MINIMAP_PADDING,
      width: viewWidth * minimapScale,
      height: viewHeight * minimapScale,
    };
  }, [viewport, bounds, minimapScale]);

  // Handle clicking on minimap to navigate
  const handleMinimapClick = useCallback((e: React.MouseEvent) => {
    if (!minimapRef.current) return;

    const rect = minimapRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left - MINIMAP_PADDING;
    const clickY = e.clientY - rect.top - MINIMAP_PADDING;

    // Convert minimap coordinates to canvas coordinates
    const canvasX = clickX / minimapScale + bounds.minX;
    const canvasY = clickY / minimapScale + bounds.minY;

    // Center viewport on clicked position
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    setViewport({
      x: centerX - canvasX * viewport.scale,
      y: centerY - canvasY * viewport.scale,
    });
  }, [minimapScale, bounds, viewport.scale, setViewport]);

  // Handle dragging the viewport rectangle
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    isDragging.current = true;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current || !minimapRef.current) return;

      const rect = minimapRef.current.getBoundingClientRect();
      const moveX = moveEvent.clientX - rect.left - MINIMAP_PADDING;
      const moveY = moveEvent.clientY - rect.top - MINIMAP_PADDING;

      const canvasX = moveX / minimapScale + bounds.minX;
      const canvasY = moveY / minimapScale + bounds.minY;

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      setViewport({
        x: centerX - canvasX * viewport.scale,
        y: centerY - canvasY * viewport.scale,
      });
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [minimapScale, bounds, viewport.scale, setViewport]);

  if (!showMinimap) return null;

  const itemsArray = Array.from(items.values());

  return (
    <div
      ref={minimapRef}
      onClick={handleMinimapClick}
      className="fixed bottom-20 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden cursor-crosshair z-40"
      style={{ width: MINIMAP_WIDTH, height: MINIMAP_HEIGHT }}
    >
      {/* Items */}
      <svg width={MINIMAP_WIDTH} height={MINIMAP_HEIGHT} className="absolute inset-0">
        {itemsArray.map((item) => {
          const x = (item.x - bounds.minX) * minimapScale + MINIMAP_PADDING;
          const y = (item.y - bounds.minY) * minimapScale + MINIMAP_PADDING;
          const w = Math.max(item.width * minimapScale, 2);
          const h = Math.max(item.height * minimapScale, 2);

          return (
            <rect
              key={item.id}
              x={x}
              y={y}
              width={w}
              height={h}
              className={`
                ${item.badge === 'webview' ? 'fill-cyan-500' : 'fill-blue-400'}
                ${item.badge === 'group' ? 'fill-gray-300 dark:fill-gray-600' : ''}
              `}
              rx={1}
            />
          );
        })}

        {/* Viewport Rectangle */}
        <rect
          x={viewportRect.x}
          y={viewportRect.y}
          width={viewportRect.width}
          height={viewportRect.height}
          fill="rgba(59, 130, 246, 0.1)"
          stroke="rgb(59, 130, 246)"
          strokeWidth={1.5}
          rx={2}
          className="cursor-move"
          onMouseDown={handleMouseDown}
        />
      </svg>

      {/* Zoom indicator */}
      <div className="absolute bottom-1 right-2 text-[10px] text-gray-400 dark:text-gray-500">
        {Math.round(viewport.scale * 100)}%
      </div>
    </div>
  );
};
