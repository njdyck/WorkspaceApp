import React from 'react';
import { GRID_SIZE } from '@/constants/canvas';
import { useUIStore } from '@/stores';

export const CanvasGrid: React.FC = () => {
  const darkMode = useUIStore((s) => s.darkMode);

  // Grid pattern color based on theme
  const dotColor = darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.04)';

  return (
    <div
      className="absolute inset-[-1000%] pointer-events-none"
      style={{
        backgroundImage: `radial-gradient(${dotColor} 1px, transparent 1px)`,
        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
      }}
    />
  );
};
