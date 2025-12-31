import { useCallback, useState, useEffect } from 'react';
import { useCanvasStore } from '@/stores';

export const useItemResize = () => {
  const { items, updateItem, viewport } = useCanvasStore();
  const [isResizing, setIsResizing] = useState(false);
  const [resizeState, setResizeState] = useState<{
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
      setResizeState({
        itemId,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: item.width,
        startHeight: item.height,
      });
    },
    [items]
  );

  useEffect(() => {
    if (!isResizing || !resizeState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = (e.clientX - resizeState.startX) / viewport.scale;
      const deltaY = (e.clientY - resizeState.startY) / viewport.scale;

      // Minimum dimensions
      const newWidth = Math.max(100, resizeState.startWidth + deltaX);
      const newHeight = Math.max(50, resizeState.startHeight + deltaY);

      updateItem(resizeState.itemId, {
        width: newWidth,
        height: newHeight,
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeState, updateItem, viewport.scale]);

  return {
    isResizing,
    startResize,
    updateResize: () => {},
    endResize: () => {},
  };
};
