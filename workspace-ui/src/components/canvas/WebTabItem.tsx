import React, { useEffect, useRef, useCallback, useState, memo, useMemo } from 'react';
import { Globe, Maximize2, X } from 'lucide-react';
import { CanvasItem as CanvasItemType } from '@/models';
import { useCanvasStore, useUIStore } from '@/stores';
import { useWebTabStore } from '@/stores/webTabStore';
import { useItemDrag, useItemResize } from '@/hooks';
import { isItemInFocusZone } from '@/utils/geometry';

// ============================================================================
// WEB TAB ITEM - Canvas-Karte die native Webview synchronisiert
// ============================================================================

interface WebTabItemProps {
  item: CanvasItemType;
}

const WebTabItemComponent: React.FC<WebTabItemProps> = ({ item }) => {
  const { viewport, selectedIds, updateItem, removeItem, zoomToItem } = useCanvasStore();
  const {
    createTab,
    updateTabBounds,
    closeTab,
    focusTab,
    unfocusAllTabs,
    setTabVisible,
    getTabByItemId,
  } = useWebTabStore();

  const focusMode = useUIStore((s) => s.focusMode);
  const focusZone = useUIStore((s) => s.focusZone);

  const { startDrag } = useItemDrag();
  const { startResize } = useItemResize();

  // Focus Zone awareness
  const isInFocus = useMemo(() => {
    if (!focusMode || !focusZone) return true;
    return isItemInFocusZone(item, focusZone);
  }, [focusMode, focusZone, item.x, item.y, item.width, item.height]);

  const [urlInput, setUrlInput] = useState(item.url || 'https://');
  const [isUrlFocused, setIsUrlFocused] = useState(false);
  const [tabCreated, setTabCreated] = useState(false);

  // URL-Input synchronisieren wenn item.url sich ändert
  useEffect(() => {
    if (item.url !== urlInput && !isUrlFocused) {
      setUrlInput(item.url || 'https://');
    }
  }, [item.url, isUrlFocused]);

  const isSelected = selectedIds.has(item.id);
  const tab = getTabByItemId(item.id);
  const lastBoundsRef = useRef<string>('');
  const creatingTabRef = useRef<boolean>(false);

  // Header height for bounds calculation
  const HEADER_HEIGHT = 36;

  // ============================================================================
  // BOUNDS CALCULATION - Canvas-Koordinaten zu Screen-Koordinaten
  // ============================================================================

  const calculateScreenBounds = useCallback(() => {
    // Canvas-Position zu Screen-Position konvertieren
    const screenX = (item.x * viewport.scale) + viewport.x;
    const screenY = (item.y * viewport.scale) + viewport.y;
    const screenWidth = item.width * viewport.scale;
    const screenHeight = item.height * viewport.scale;

    // App-Toolbar (48px = h-12)
    const appToolbarHeight = 48;
    const borderWidth = 1;

    return {
      x: Math.round(screenX + borderWidth),
      y: Math.round(screenY + (HEADER_HEIGHT * viewport.scale) + appToolbarHeight),
      width: Math.round(Math.max(screenWidth - (borderWidth * 2), 100)),
      height: Math.round(Math.max(screenHeight - (HEADER_HEIGHT * viewport.scale) - borderWidth, 100)),
    };
  }, [item.x, item.y, item.width, item.height, viewport.x, viewport.y, viewport.scale]);

  // ============================================================================
  // TAB CREATION & SYNC
  // ============================================================================

  // Tab erstellen wenn URL vorhanden
  useEffect(() => {
    const existingTab = getTabByItemId(item.id);

    // Wenn Tab bereits existiert und URL gleich ist, nichts tun
    if (existingTab && existingTab.url === item.url) {
      if (!tabCreated) {
        setTabCreated(true);
      }
      return;
    }

    // Wenn Tab existiert aber URL anders ist, Tab schließen und neu erstellen
    if (existingTab && existingTab.url !== item.url) {
      closeTab(existingTab.id).then(() => {
        setTabCreated(false);
      });
      return;
    }

    // Wenn keine URL, nichts tun
    if (!item.url) {
      if (existingTab) {
        closeTab(existingTab.id);
        setTabCreated(false);
      }
      return;
    }

    // Tab erstellen wenn noch nicht vorhanden
    if (!tabCreated && !existingTab && !creatingTabRef.current) {
      creatingTabRef.current = true;
      const bounds = calculateScreenBounds();

      createTab(item.id, item.url, bounds).then((tabId) => {
        creatingTabRef.current = false;
        if (tabId) {
          setTabCreated(true);
        }
      }).catch(() => {
        creatingTabRef.current = false;
      });
    }
  }, [item.url, item.id, tabCreated, createTab, getTabByItemId, closeTab, calculateScreenBounds]);

  // Bounds synchronisieren wenn sich Position/Größe/Viewport ändert
  // WICHTIG: Sofortige Updates ohne RAF für bessere Synchronisation beim Panning
  useEffect(() => {
    if (!tab) return;

    const bounds = calculateScreenBounds();
    const boundsKey = JSON.stringify(bounds);

    // Nur updaten wenn sich wirklich was geändert hat
    if (boundsKey === lastBoundsRef.current) return;
    lastBoundsRef.current = boundsKey;

    // Sofortige Updates für perfekte Synchronisation
    updateTabBounds(tab.id, bounds);
  }, [tab, calculateScreenBounds, updateTabBounds, item.x, item.y, item.width, item.height, viewport.x, viewport.y, viewport.scale]);

  // Tab schließen wenn Item entfernt wird
  useEffect(() => {
    return () => {
      if (tab) {
        closeTab(tab.id);
      }
    };
  }, [tab?.id, closeTab]);

  // Prüfe ob Tab noch existiert (z.B. nach Board-Wechsel)
  useEffect(() => {
    if (tabCreated && !tab) {
      setTabCreated(false);
    }
  }, [tab, tabCreated]);

  // Focus Zone: Webview verstecken wenn außerhalb der Zone
  useEffect(() => {
    if (tab && focusMode) {
      setTabVisible(tab.id, isInFocus);
    } else if (tab && !focusMode) {
      // Wenn Focus Mode deaktiviert wird, alle Tabs wieder sichtbar machen
      setTabVisible(tab.id, true);
    }
  }, [tab, focusMode, isInFocus, setTabVisible]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    unfocusAllTabs();
    startDrag(e, item.id);
  };

  const handleTabClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tab) {
      focusTab(tab.id);
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tab) {
      closeTab(tab.id);
    }
    removeItem(item.id);
  };

  const handleZoomToFit = (e: React.MouseEvent) => {
    e.stopPropagation();
    zoomToItem(item.id);
  };

  const handleUrlSubmit = () => {
    let finalUrl = urlInput.trim();
    if (finalUrl && !finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }
    if (finalUrl && finalUrl !== item.url) {
      updateItem(item.id, { url: finalUrl, content: new URL(finalUrl).hostname });
      if (tab) {
        closeTab(tab.id);
        setTabCreated(false);
      }
    }
  };

  const handleUrlKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      handleUrlSubmit();
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'Escape') {
      setUrlInput(item.url || 'https://');
      (e.target as HTMLInputElement).blur();
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  // Dimming styles for items outside focus zone
  const dimmedStyle = !isInFocus ? {
    opacity: 0.3,
    filter: 'grayscale(50%)',
    pointerEvents: 'none' as const,
  } : {};

  return (
    <div
      style={{
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
        ...dimmedStyle,
      }}
      className={`
        absolute rounded-lg overflow-hidden select-none group flex flex-col
        bg-white border transition-shadow
        ${isSelected
          ? 'border-blue-400 shadow-lg ring-2 ring-blue-100'
          : 'border-gray-200 shadow-md hover:shadow-lg'
        }
        ${tab?.isFocused ? 'border-blue-400 ring-2 ring-blue-100' : ''}
      `}
    >
      {/* Header Bar - Einfach und draggable */}
      <div
        onMouseDown={handleMouseDown}
        onDoubleClick={handleZoomToFit}
        className="h-9 bg-gray-50 border-b border-gray-200 flex items-center gap-2 px-3 cursor-move shrink-0"
      >
        {/* Globe Icon */}
        <Globe size={14} className="text-gray-400 shrink-0" />

        {/* URL Input */}
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={handleUrlKeyDown}
          onFocus={() => setIsUrlFocused(true)}
          onBlur={() => {
            setIsUrlFocused(false);
            handleUrlSubmit();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          placeholder="URL eingeben..."
          className={`
            flex-1 text-xs bg-transparent outline-none min-w-0 py-1 px-2 rounded
            ${isUrlFocused
              ? 'bg-white ring-1 ring-blue-400 text-gray-800'
              : 'text-gray-600 hover:bg-gray-100'
            }
          `}
        />

        {/* Action Buttons */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleZoomToFit}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
            title="Zoom to Fit"
          >
            <Maximize2 size={12} />
          </button>
          <button
            onClick={handleClose}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500"
            title="Schließen"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div
        className="flex-1 relative bg-white"
        onClick={handleTabClick}
        onDoubleClick={handleZoomToFit}
      >
        {!item.url ? (
          <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <Globe size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">URL eingeben</p>
            </div>
          </div>
        ) : !tabCreated ? (
          <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-500">Lädt...</p>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0">
            {!tab?.isFocused && (
              <div className="absolute inset-0 hover:bg-black/5 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                <div className="bg-white/95 px-4 py-2 rounded-lg shadow-lg border border-gray-200">
                  <p className="text-sm text-gray-700">Klicken zum Aktivieren</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resize Handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-1"
        onMouseDown={(e) => {
          e.stopPropagation();
          startResize(e, item.id);
        }}
      >
        <div className="w-2 h-2 border-r-2 border-b-2 border-gray-300 rounded-br-sm" />
      </div>
    </div>
  );
};

// Memoized export
export const WebTabItem = memo(WebTabItemComponent);
