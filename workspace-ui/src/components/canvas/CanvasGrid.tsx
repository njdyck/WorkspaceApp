import React from 'react';
import { GRID_SIZE } from '@/constants/canvas';

export const CanvasGrid: React.FC = () => {
  // Grid stays infinite, so we don't scale/translate it inside the viewport usually?
  // Actually, if we put it inside CanvasViewport, it will move/scale correctly with the world.
  // BUT: Grid pattern usually should be infinite.
  // If we put a div with 100% width/height inside a scaled container, it will only cover the scaled area?
  // No, `absolute inset-0` inside a transformed container covers the container's bounding box.
  // The viewport container has no explicit size, so it might collapse?
  // CanvasViewport has `absolute inset-0` but NO transform on itself? Wait.
  
  // Let's check CanvasViewport implementation again.
  // It has `absolute inset-0` AND `transform`.
  // So it matches the screen size, but transformed?
  // If I translate it by 1000px, it moves off screen.
  
  // Strategy for Grid:
  // The grid pattern should be stationary relative to the WORLD.
  // If we put it inside the transformed viewport, the background-position logic needs to change.
  // Before: We moved background-position by viewport.x.
  // Now: The whole DIV moves. So background-position should just be 0?
  
  // Let's try putting it inside first.
  
  return (
    <div
      className="absolute inset-[-1000%] pointer-events-none opacity-[0.04]" // Make it huge to cover pan area
      style={{
        backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
        // No manual background position needed if the div itself moves
      }}
    />
  );
};
