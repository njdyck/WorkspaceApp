import { useCallback, useState, useEffect, useRef } from 'react';
import { useCanvasStore } from '@/stores';

export const useItemResize = () => {
  const { items, updateItem } = useCanvasStore();
  const [isResizing, setIsResizing] = useState(false);

  // Ref für Animation Frame ID, um Loop zu stoppen
  const rafId = useRef<number | null>(null);

  // Ref für den aktuellen Maus-Status, damit rAF immer die neuesten Daten hat
  const mouseRef = useRef<{ x: number; y: number } | null>(null);

  const resizeState = useRef<{
    itemId: string;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  const startResize = useCallback(
    (e: React.MouseEvent, itemId: string) => {
      e.stopPropagation();
      if (e.button !== 0) return;

      const item = items.get(itemId);
      if (!item) return;

      setIsResizing(true);
      resizeState.current = {
        itemId,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: item.width,
        startHeight: item.height,
      };

      // Initialize mouse ref
      mouseRef.current = { x: e.clientX, y: e.clientY };
    },
    [items]
  );

  // Der Animation Loop - berechnet und wendet Resize an
  const performResizeUpdate = useCallback(() => {
    if (!resizeState.current || !mouseRef.current) return;

    const { itemId, startX, startY, startWidth, startHeight } = resizeState.current;
    const { x: currentX, y: currentY } = mouseRef.current;
    const currentScale = useCanvasStore.getState().viewport.scale;

    // Calculate delta in world coordinates
    const deltaX = (currentX - startX) / currentScale;
    const deltaY = (currentY - startY) / currentScale;

    // Minimum dimensions
    const newWidth = Math.max(100, startWidth + deltaX);
    const newHeight = Math.max(50, startHeight + deltaY);

    updateItem(itemId, {
      width: newWidth,
      height: newHeight,
    });
  }, [updateItem]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Update mouse position immediately
      mouseRef.current = { x: e.clientX, y: e.clientY };

      // Request update if not already scheduled
      if (rafId.current === null) {
        rafId.current = requestAnimationFrame(() => {
          performResizeUpdate();
          rafId.current = null;
        });
      }
    };

    const handleMouseUp = () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      setIsResizing(false);
      resizeState.current = null;
      mouseRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, [isResizing, performResizeUpdate]);

  return {
    isResizing,
    startResize,
    updateResize: () => {},
    endResize: () => {},
  };
};
