import { useMemo } from 'react';
import { useCanvasStore } from '@/stores';
import { CanvasItem } from '@/models';

interface Connection {
  id: string; // unique connection id
  fromId: string;
  toId: string;
  distance: number;
}

const PROXIMITY_THRESHOLD = 500; // Increased range for better feel

// Calculate center point of an item
const getCenter = (item: CanvasItem) => ({
  x: item.x + item.width / 2,
  y: item.y + item.height / 2,
});

// Calculate distance between two centers
const getDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

export const useProximity = () => {
  const { items } = useCanvasStore();

  const connections = useMemo(() => {
    const itemsArray = Array.from(items.values());
    const newConnections: Connection[] = [];
    const processedPairs = new Set<string>();

    for (let i = 0; i < itemsArray.length; i++) {
      for (let j = i + 1; j < itemsArray.length; j++) {
        const itemA = itemsArray[i];
        const itemB = itemsArray[j];
        
        const centerA = getCenter(itemA);
        const centerB = getCenter(itemB);
        
        // Calculate distance between edges (approximate for now using centers)
        // Ideally we subtract radii or box extents, but center-to-center is smoother for visuals
        const distance = getDistance(centerA, centerB);
        
        // Adjust threshold based on item sizes? 
        // For now, simple fixed threshold works best for "magnetic feel"
        if (distance < PROXIMITY_THRESHOLD) {
          // Check if already processed (though the nested loop structure prevents duplicates naturally)
          const pairId = [itemA.id, itemB.id].sort().join('-');
          
          if (!processedPairs.has(pairId)) {
            newConnections.push({
              id: pairId,
              fromId: itemA.id,
              toId: itemB.id,
              distance,
            });
            processedPairs.add(pairId);
          }
        }
      }
    }
    return newConnections;
  }, [items]); // Re-calculate when items change (position updates trigger this)

  return { connections, threshold: PROXIMITY_THRESHOLD };
};

