import React, { memo, useCallback, useMemo } from 'react';
import { Link2 } from 'lucide-react';
import { CanvasItem as CanvasItemType } from '@/models';
import { useCanvasStore, useUIStore } from '@/stores';
import { useItemDrag, useItemResize } from '@/hooks';
import { isItemInFocusZone } from '@/utils/geometry';

interface CanvasItemProps {
  item: CanvasItemType;
}

const CanvasItemComponent: React.FC<CanvasItemProps> = ({ item }) => {
  // Granulare Zustand-Selektoren - nur re-render wenn sich relevante Daten ändern
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const isConnecting = useCanvasStore((s) => s.isConnecting);
  const connectingFromId = useCanvasStore((s) => s.connectingFromId);
  const startConnecting = useCanvasStore((s) => s.startConnecting);
  const finishConnecting = useCanvasStore((s) => s.finishConnecting);

  const openSidePanel = useUIStore((s) => s.openSidePanel);
  const openContextMenu = useUIStore((s) => s.openContextMenu);
  const focusMode = useUIStore((s) => s.focusMode);
  const focusZone = useUIStore((s) => s.focusZone);
  const { startDrag } = useItemDrag();
  const { startResize } = useItemResize();

  const isSelected = selectedIds.has(item.id);

  // Focus Zone awareness
  const isInFocus = useMemo(() => {
    if (!focusMode || !focusZone) return true;
    return isItemInFocusZone(item, focusZone);
  }, [focusMode, focusZone, item.x, item.y, item.width, item.height]);
  const isGroup = item.badge === 'group';
  const isConnectingFrom = connectingFromId === item.id;

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openSidePanel(item.id);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Im Verbindungsmodus: Klick auf Item beendet Verbindung
    if (isConnecting && !isConnectingFrom) {
      finishConnecting(item.id);
      return;
    }
    
    startDrag(e, item.id);
  };

  const handleStartConnection = (e: React.MouseEvent) => {
    e.stopPropagation();
    startConnecting(item.id);
  };

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openContextMenu(e.clientX, e.clientY, item.id);
  }, [openContextMenu, item.id]);

  const getBadgeColor = () => {
    switch (item.badge) {
      case 'link': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'task': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'idea': return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'note': return 'bg-gray-50 text-gray-600 border-gray-100';
      case 'group': return 'bg-transparent text-gray-400 border-none';
      default: return 'bg-gray-50 text-gray-500 border-gray-100';
    }
  };

  const getStatusColor = () => {
    switch (item.status) {
      case 'inbox': return 'bg-gray-50 text-gray-500';
      case 'active': return 'bg-blue-50 text-blue-600';
      case 'done': return 'bg-green-50 text-green-600';
      default: return 'bg-gray-50 text-gray-500';
    }
  };

  // Highlight wenn dieses Item das Ziel einer Verbindung sein kann
  const canBeTarget = isConnecting && !isConnectingFrom;

  // Dimming styles for items outside focus zone
  const dimmedStyle = !isInFocus ? {
    opacity: 0.3,
    filter: 'grayscale(50%)',
    pointerEvents: 'none' as const,
  } : {};

  // Group Rendering (Container Style)
  if (isGroup) {
    const bgColor = item.color && item.color !== 'transparent' ? item.color : 'rgba(249, 250, 251, 0.3)';
    const borderColor = isSelected
      ? 'rgba(96, 165, 250, 1)' // blue-400
      : item.color && item.color !== 'transparent'
        ? 'rgba(0,0,0,0.05)' // subtle border for colored groups
        : 'rgba(229, 231, 235, 0.5)'; // gray-200/50

    return (
      <div
        onMouseDown={isInFocus ? handleMouseDown : undefined}
        onDoubleClick={isInFocus ? handleDoubleClick : undefined}
        onContextMenu={isInFocus ? handleContextMenu : undefined}
        style={{
          left: item.x,
          top: item.y,
          width: item.width,
          height: item.height,
          backgroundColor: bgColor,
          borderColor: borderColor,
          ...dimmedStyle,
          transition: 'opacity 0.2s, filter 0.2s',
          willChange: 'transform',
          contain: 'layout style paint',
        }}
        className={`
          absolute rounded-2xl border-2 transition-shadow select-none group backdrop-blur-sm
          ${isSelected
            ? 'shadow-md ring-2 ring-blue-100'
            : 'hover:border-gray-300/80'
          }
          ${canBeTarget ? 'ring-2 ring-green-300 border-green-400' : ''}
          ${isConnectingFrom ? 'ring-2 ring-blue-300 border-blue-400' : ''}
        `}
      >
        {/* Group Header */}
        <div className="absolute -top-8 left-0 px-2 py-1 flex items-center gap-2">
          <h3 className="text-gray-500 font-medium text-sm truncate">{item.content}</h3>
          
          {/* Connection Button */}
          <button
            onClick={handleStartConnection}
            className="opacity-0 group-hover:opacity-100 p-1 rounded bg-white shadow-sm border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
            title="Verbindung erstellen"
          >
            <Link2 size={12} className="text-gray-500" />
          </button>
        </div>

        {/* Resize Handle */}
        <div
          className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize opacity-0 group-hover:opacity-100 hover:opacity-100 flex items-end justify-end p-1.5"
          onMouseDown={(e) => startResize(e, item.id)}
        >
          <div className="w-2 h-2 border-r-2 border-b-2 border-gray-400 rounded-br-sm"></div>
        </div>
      </div>
    );
  }

  // Standard Item Rendering
  return (
    <div
      onMouseDown={isInFocus ? handleMouseDown : undefined}
      onDoubleClick={isInFocus ? handleDoubleClick : undefined}
      onContextMenu={isInFocus ? handleContextMenu : undefined}
      style={{
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
        ...dimmedStyle,
        transition: 'opacity 0.2s, filter 0.2s',
        willChange: 'transform',
        contain: 'layout style paint',
      }}
      className={`
        absolute bg-white dark:bg-gray-800 rounded-lg border p-4 cursor-pointer transition-shadow select-none group z-10
        ${isSelected
          ? 'border-blue-400 shadow-md ring-2 ring-blue-100 dark:ring-blue-900'
          : 'border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md'
        }
        ${canBeTarget ? 'ring-2 ring-green-300 border-green-400 shadow-lg' : ''}
        ${isConnectingFrom ? 'ring-2 ring-blue-300 border-blue-400' : ''}
      `}
    >
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-gray-800 dark:text-gray-100 font-medium text-sm truncate flex-1 mr-2">
            {item.content}
          </h3>
          {item.badge && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getBadgeColor()}`}>
              {item.badge}
            </span>
          )}
        </div>
        
        <div className="flex-1"></div>

        <div className="flex justify-between items-end">
          <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${getStatusColor()}`}>
            {item.status}
          </span>
          
          {/* Connection Button */}
          <button
            onClick={handleStartConnection}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 transition-all"
            title="Verbindung erstellen"
          >
            <Link2 size={12} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Resize Handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize opacity-0 group-hover:opacity-100 hover:opacity-100 flex items-end justify-end p-1"
        onMouseDown={(e) => startResize(e, item.id)}
      >
        <div className="w-2 h-2 border-r-2 border-b-2 border-gray-300 rounded-br-sm"></div>
      </div>
    </div>
  );
};

// Memoized export - re-renders nur wenn sich item oder selection ändert
export const CanvasItem = memo(CanvasItemComponent);
