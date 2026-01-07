import React from 'react';
import { useCanvasStore } from '@/stores';

interface CanvasViewportProps {
  children: React.ReactNode;
}

export const CanvasViewport: React.FC<CanvasViewportProps> = ({ children }) => {
  const { viewport } = useCanvasStore();

  return (
    <div
      className="absolute inset-0"
      style={{
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
        transformOrigin: '0 0',
        willChange: 'transform', // GPU acceleration
        backfaceVisibility: 'hidden', // Prevent flickering
        perspective: 1000, // Enable 3D acceleration
      }}
    >
      {children}
    </div>
  );
};





