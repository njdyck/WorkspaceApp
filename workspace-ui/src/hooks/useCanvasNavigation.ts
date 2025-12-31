import { useCallback, useEffect, useState } from 'react';
import { useCanvasStore } from '@/stores';
import { isPanMode } from '@/utils';

export const useCanvasNavigation = () => {
  const { pan, zoom, setIsPanning, isPanning, viewport } = useCanvasStore();
  const [isModifierPressed, setIsModifierPressed] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  
  // Track modifier key state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) {
        setIsModifierPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.altKey && !e.ctrlKey && !e.metaKey) {
        setIsModifierPressed(false);
        if (isPanning) {
          setIsPanning(false);
          setDragStart(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPanning, setIsPanning]);

  // Robust Zoom Handling
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      // Check for pinch-to-zoom (ctrlKey is often set by browsers on trackpad pinch)
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        
        // Normalize delta
        const delta = -e.deltaY;
        const zoomFactor = 0.002; // Smoother zoom for trackpads
        const scaleChange = 1 + delta * zoomFactor;
        
        const newScale = viewport.scale * scaleChange;
        zoom(newScale, e.clientX, e.clientY);
      } else {
        // Pan
        e.preventDefault();
        pan(-e.deltaX, -e.deltaY);
      }
    },
    [pan, zoom, viewport.scale]
  );

  // Add non-passive event listener for proper zoom prevention
  // This is a common React issue where onWheel is passive and can't preventDefault properly in some browsers
  // But React 18 usually handles this. If needed, we could attach a ref listener.

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return; // Only left click
      
      if (isPanMode(e)) {
        setIsPanning(true);
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    },
    [setIsPanning]
  );

  useEffect(() => {
    if (!isPanning) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStart) return;

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      pan(deltaX, deltaY);
      setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
      setIsPanning(false);
      setDragStart(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, dragStart, pan]);

  return {
    isPanning,
    isModifierPressed,
    handlers: {
      onWheel: handleWheel,
      onMouseDown: handleMouseDown,
      // onMouseMove/Up handled by window listeners for robustness
      onMouseMove: () => {}, 
      onMouseUp: () => {},
      onMouseLeave: () => {},
    },
  };
};
