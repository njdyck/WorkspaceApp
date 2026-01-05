import { useCallback, useEffect, useState, useRef } from 'react';
import { useCanvasStore, useUIStore } from '@/stores';
import { GRID_SIZE } from '@/constants/canvas';

export const useItemDrag = () => {
  const { selectedIds, select } = useCanvasStore();
  const [isDragging, setIsDragging] = useState(false);
  
  // Ref für Animation Frame ID, um Loop zu stoppen
  const rafId = useRef<number | null>(null);
  
  // Ref für den aktuellen Maus-Status, damit rAF immer die neuesten Daten hat
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  
  const dragState = useRef<{
    startX: number;
    startY: number;
    initialItems: Map<string, { x: number; y: number }>;
  } | null>(null);

  const startDrag = useCallback(
    (e: React.MouseEvent, itemId: string) => {
      e.stopPropagation();
      if (e.button !== 0) return;

      // Handle selection
      const currentSelectedIds = new Set(selectedIds);
      if (!currentSelectedIds.has(itemId)) {
        if (e.metaKey || e.ctrlKey) {
          useCanvasStore.getState().toggleSelect(itemId);
          currentSelectedIds.add(itemId); 
        } else {
          select([itemId]);
          currentSelectedIds.clear();
          currentSelectedIds.add(itemId);
        }
      }

      // Snapshot initial positions
      const initialPositions = new Map<string, { x: number; y: number }>();
      const currentItems = useCanvasStore.getState().items;
      
      const idsToDrag = currentSelectedIds.has(itemId) ? Array.from(currentSelectedIds) : [itemId];
      
      idsToDrag.forEach(id => {
        const item = currentItems.get(id);
        if (item) {
          initialPositions.set(id, { x: item.x, y: item.y });
        }
      });

      setIsDragging(true);
      dragState.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialItems: initialPositions,
      };
      
      // Initialize mouse ref
      mouseRef.current = { x: e.clientX, y: e.clientY };
    },
    [selectedIds, select]
  );

  // Helper function for grid snapping
  const snapToGrid = (value: number): number => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  };

  // Der Animation Loop
  const performDragUpdate = useCallback(() => {
    if (!dragState.current || !mouseRef.current) return;

    const { startX, startY, initialItems } = dragState.current;
    const { x: currentX, y: currentY } = mouseRef.current;
    const currentScale = useCanvasStore.getState().viewport.scale;
    const gridSnapping = useUIStore.getState().gridSnapping;

    // Calculate total delta in world coordinates
    const deltaX = (currentX - startX) / currentScale;
    const deltaY = (currentY - startY) / currentScale;

    const allItems = new Map(useCanvasStore.getState().items);
    let hasChanges = false;

    initialItems.forEach((initialPos, id) => {
      const item = allItems.get(id);
      if (item) {
        let newX = initialPos.x + deltaX;
        let newY = initialPos.y + deltaY;

        // Apply grid snapping if enabled
        if (gridSnapping) {
          newX = snapToGrid(newX);
          newY = snapToGrid(newY);
        }

        allItems.set(id, {
          ...item,
          x: newX,
          y: newY,
          updatedAt: Date.now(),
        });
        hasChanges = true;
      }
    });

    if (hasChanges) {
      useCanvasStore.getState().setItems(Array.from(allItems.values()));
    }
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Update mouse position immediately
      mouseRef.current = { x: e.clientX, y: e.clientY };
      
      // Request update if not already scheduled
      if (rafId.current === null) {
        rafId.current = requestAnimationFrame(() => {
          performDragUpdate();
          rafId.current = null;
        });
      }
    };

    const handleMouseUp = () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      setIsDragging(false);
      dragState.current = null;
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
  }, [isDragging, performDragUpdate]);

  return {
    isDragging,
    startDrag,
    updateDrag: () => {},
    endDrag: () => {},
  };
};
