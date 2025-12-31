import React from 'react';
import { useCanvasStore } from '@/stores';
import { selectionRectToRect } from '@/utils';

export const SelectionRect: React.FC = () => {
  const { selectionRect } = useCanvasStore();

  if (!selectionRect) return null;

  const rect = selectionRectToRect(selectionRect);

  return (
    <div
      className="absolute border border-blue-400 bg-blue-100/20 pointer-events-none z-10"
      style={{
        left: rect.x, // Removed viewport.x
        top: rect.y,  // Removed viewport.y
        width: rect.width,
        height: rect.height,
        borderStyle: 'dashed',
      }}
    />
  );
};
