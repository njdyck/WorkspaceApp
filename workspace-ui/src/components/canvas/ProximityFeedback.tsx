import React from 'react';
import { useCanvasStore } from '@/stores';
import { useProximity } from '@/hooks';

export const ProximityFeedback: React.FC = () => {
  const { items } = useCanvasStore();
  const { connections, threshold } = useProximity();

  return (
    <svg
      className="absolute inset-0 pointer-events-none overflow-visible z-0"
      style={{
        // Removed manual transform - handled by parent CanvasViewport
        width: '100%',
        height: '100%',
      }}
    >
      <defs>
        <linearGradient id="proximityGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#94a3b8" stopOpacity="0" />
          <stop offset="50%" stopColor="#64748b" stopOpacity="1" />
          <stop offset="100%" stopColor="#94a3b8" stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {connections.map((conn) => {
        const itemA = items.get(conn.fromId);
        const itemB = items.get(conn.toId);

        if (!itemA || !itemB) return null;

        const centerA = {
          x: itemA.x + itemA.width / 2,
          y: itemA.y + itemA.height / 2,
        };

        const centerB = {
          x: itemB.x + itemB.width / 2,
          y: itemB.y + itemB.height / 2,
        };

        const opacity = Math.max(0, 1 - conn.distance / threshold);
        const visualOpacity = Math.pow(opacity, 1.5) * 0.6;

        return (
          <g key={conn.id} opacity={visualOpacity}>
            <line
              x1={centerA.x}
              y1={centerA.y}
              x2={centerB.x}
              y2={centerB.y}
              stroke="#94a3b8"
              strokeWidth="2"
              strokeDasharray="4 4"
              strokeLinecap="round"
            />
            <circle 
                cx={(centerA.x + centerB.x) / 2} 
                cy={(centerA.y + centerB.y) / 2} 
                r="3" 
                fill="#64748b"
            />
          </g>
        );
      })}
    </svg>
  );
};
