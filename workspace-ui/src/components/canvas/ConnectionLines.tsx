import React from 'react';
import { useCanvasStore } from '@/stores';

export const ConnectionLines: React.FC = () => {
  const { items, connections, isConnecting, connectingFromId, removeConnection } = useCanvasStore();

  // Berechne Mittelpunkt eines Items
  const getCenter = (itemId: string) => {
    const item = items.get(itemId);
    if (!item) return null;
    return {
      x: item.x + item.width / 2,
      y: item.y + item.height / 2,
    };
  };

  // Berechne Ankerpunkt am Rand eines Items
  const getEdgePoint = (fromCenter: { x: number; y: number }, toCenter: { x: number; y: number }, itemId: string) => {
    const item = items.get(itemId);
    if (!item) return fromCenter;

    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;
    const angle = Math.atan2(dy, dx);

    const halfWidth = item.width / 2;
    const halfHeight = item.height / 2;

    // Berechne Schnittpunkt mit Rechteck
    const tanAngle = Math.abs(Math.tan(angle));
    let edgeX, edgeY;

    if (tanAngle <= halfHeight / halfWidth) {
      // Schnitt mit linker oder rechter Kante
      edgeX = dx > 0 ? halfWidth : -halfWidth;
      edgeY = edgeX * Math.tan(angle);
    } else {
      // Schnitt mit oberer oder unterer Kante
      edgeY = dy > 0 ? halfHeight : -halfHeight;
      edgeX = edgeY / Math.tan(angle);
    }

    return {
      x: fromCenter.x + edgeX,
      y: fromCenter.y + edgeY,
    };
  };

  const connectionsArray = Array.from(connections.values());

  return (
    <svg
      className="absolute inset-0 pointer-events-none overflow-visible"
      style={{ width: '100%', height: '100%', zIndex: 5 }}
    >
      <defs>
        {/* Pfeilspitze */}
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
        </marker>
        
        {/* Hover Pfeilspitze */}
        <marker
          id="arrowhead-hover"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
        </marker>
      </defs>

      {/* Bestehende Verbindungen */}
      {connectionsArray.map((conn) => {
        const fromCenter = getCenter(conn.fromId);
        const toCenter = getCenter(conn.toId);
        
        if (!fromCenter || !toCenter) return null;

        const fromEdge = getEdgePoint(fromCenter, toCenter, conn.fromId);
        const toEdge = getEdgePoint(toCenter, fromCenter, conn.toId);

        // Kontrollpunkte für Kurve
        const midX = (fromEdge.x + toEdge.x) / 2;
        const midY = (fromEdge.y + toEdge.y) / 2;
        
        // Leichte Kurve
        const dx = toEdge.x - fromEdge.x;
        const dy = toEdge.y - fromEdge.y;
        const controlOffset = Math.min(Math.abs(dx), Math.abs(dy)) * 0.2;
        
        const path = `M ${fromEdge.x} ${fromEdge.y} Q ${midX} ${midY - controlOffset} ${toEdge.x} ${toEdge.y}`;

        return (
          <g key={conn.id} className="group">
            {/* Unsichtbare breitere Linie für bessere Klickbarkeit */}
            <path
              d={path}
              stroke="transparent"
              strokeWidth="20"
              fill="none"
              className="pointer-events-auto cursor-pointer"
              onClick={() => removeConnection(conn.id)}
            />
            
            {/* Sichtbare Linie */}
            <path
              d={path}
              stroke="#64748b"
              strokeWidth="2"
              fill="none"
              markerEnd="url(#arrowhead)"
              className="transition-all group-hover:stroke-red-500 pointer-events-none"
            />
            
            {/* Label falls vorhanden */}
            {conn.label && (
              <text
                x={midX}
                y={midY - 8}
                textAnchor="middle"
                className="text-xs fill-gray-500 pointer-events-none"
              >
                {conn.label}
              </text>
            )}
            
            {/* Delete Indikator bei Hover */}
            <circle
              cx={midX}
              cy={midY}
              r="8"
              className="fill-white stroke-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            />
            <text
              x={midX}
              y={midY + 4}
              textAnchor="middle"
              className="text-xs fill-red-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            >
              ×
            </text>
          </g>
        );
      })}

      {/* Verbindung im Erstellungsmodus */}
      {isConnecting && connectingFromId && (
        <ConnectionPreview fromId={connectingFromId} />
      )}
    </svg>
  );
};

// Vorschau-Komponente für neue Verbindung
const ConnectionPreview: React.FC<{ fromId: string }> = ({ fromId }) => {
  const { items } = useCanvasStore();
  const [mousePos, setMousePos] = React.useState<{ x: number; y: number } | null>(null);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Wir brauchen die Position relativ zum Canvas-Viewport
      const canvas = document.querySelector('.infinite-canvas-viewport');
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const transform = window.getComputedStyle(canvas).transform;
      const matrix = new DOMMatrix(transform);
      
      // Invertiere die Transformation, um Canvas-Koordinaten zu bekommen
      const scale = matrix.a;
      const translateX = matrix.e;
      const translateY = matrix.f;
      
      setMousePos({
        x: (e.clientX - rect.left - translateX) / scale,
        y: (e.clientY - rect.top - translateY) / scale,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const fromItem = items.get(fromId);
  if (!fromItem || !mousePos) return null;

  const fromCenter = {
    x: fromItem.x + fromItem.width / 2,
    y: fromItem.y + fromItem.height / 2,
  };

  return (
    <line
      x1={fromCenter.x}
      y1={fromCenter.y}
      x2={mousePos.x}
      y2={mousePos.y}
      stroke="#3b82f6"
      strokeWidth="2"
      strokeDasharray="8 4"
      className="pointer-events-none"
    />
  );
};

