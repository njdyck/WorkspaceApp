import { useCallback, useState } from 'react';
import { useCanvasStore } from '@/stores';
import { getItemsInRect, isPanMode } from '@/utils';
import { SelectionRect } from '@/types';

export const useSelection = () => {
  const { items, select, setSelectionRect, selectionRect, viewport } = useCanvasStore();
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);

  const startSelection = useCallback(
    (e: React.MouseEvent, canvasRef: HTMLDivElement | null) => {
      if (isPanMode(e)) return false;
      if (e.button !== 0) return false;
      
      const rect = canvasRef?.getBoundingClientRect();
      if (!rect) return false;

      // Convert to canvas coordinates
      const x = e.clientX - rect.left - viewport.x;
      const y = e.clientY - rect.top - viewport.y;

      setIsSelecting(true);
      setStartPoint({ x, y });
      setSelectionRect({ startX: x, startY: y, endX: x, endY: y });
      return true;
    },
    [viewport, setSelectionRect]
  );

  const updateSelection = useCallback(
    (e: React.MouseEvent, canvasRef: HTMLDivElement | null) => {
      if (!isSelecting || !startPoint) return;

      const rect = canvasRef?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left - viewport.x;
      const y = e.clientY - rect.top - viewport.y;

      const newRect: SelectionRect = {
        startX: startPoint.x,
        startY: startPoint.y,
        endX: x,
        endY: y,
      };

      setSelectionRect(newRect);
    },
    [isSelecting, startPoint, viewport, setSelectionRect]
  );

  const endSelection = useCallback(() => {
    if (!isSelecting || !selectionRect) {
      setIsSelecting(false);
      setStartPoint(null);
      setSelectionRect(null);
      return;
    }

    // Find items in selection rectangle
    const selectedIds = getItemsInRect(items, selectionRect);
    select(selectedIds);

    setIsSelecting(false);
    setStartPoint(null);
    setSelectionRect(null);
  }, [isSelecting, selectionRect, items, select, setSelectionRect]);

  return {
    isSelecting,
    selectionRect,
    startSelection,
    updateSelection,
    endSelection,
  };
};


