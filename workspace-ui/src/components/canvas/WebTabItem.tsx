import React, { useEffect, useRef, useCallback, useState, memo, useMemo } from 'react';
import { Globe, Maximize2 } from 'lucide-react';
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
  const { viewport, selectedIds, updateItem, removeItem } = useCanvasStore();
  const {
    createTab,
    updateTabBounds,
    closeTab,
    focusTab,
    unfocusAllTabs,
    setTabFullscreen,
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

  // ============================================================================
  // BOUNDS CALCULATION - Canvas-Koordinaten zu Screen-Koordinaten
  // ============================================================================

  const calculateScreenBounds = useCallback(() => {
    // Canvas-Position zu Screen-Position konvertieren
    const screenX = (item.x * viewport.scale) + viewport.x;
    const screenY = (item.y * viewport.scale) + viewport.y;
    const screenWidth = item.width * viewport.scale;
    const screenHeight = item.height * viewport.scale;

    // Header-Höhe des Tab-Items (40px = h-10) + App-Toolbar (48px = h-12)
    const tabHeaderHeight = 40;
    const appToolbarHeight = 48;
    const borderWidth = 2; // border-2 = 2px

    return {
      x: Math.round(screenX + borderWidth),
      y: Math.round(screenY + tabHeaderHeight + borderWidth + appToolbarHeight),
      width: Math.round(Math.max(screenWidth - (borderWidth * 2), 100)),
      height: Math.round(Math.max(screenHeight - tabHeaderHeight - (borderWidth * 2), 100)),
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
    if (!tab || tab.isFullscreen) return;

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

  const handleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tab) {
      setTabFullscreen(tab.id, !tab.isFullscreen);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tab) {
      setTabFullscreen(tab.id, true);
    }
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

  // Bei Fullscreen nur minimalen Placeholder zeigen
  if (tab?.isFullscreen) {
    return (
      <div
        style={{
          left: item.x,
          top: item.y,
          width: item.width,
          height: item.height,
        }}
        className="absolute bg-gray-900/80 rounded-2xl border-2 border-blue-500/50 flex items-center justify-center backdrop-blur-sm"
      >
        <div className="text-center text-white/70">
          <Maximize2 size={28} className="mx-auto mb-2 opacity-60" />
          <p className="text-sm font-medium">Fullscreen Modus</p>
          <p className="text-xs opacity-60 mt-1">ESC zum Beenden</p>
        </div>
      </div>
    );
  }

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
        absolute rounded-2xl overflow-hidden select-none group flex flex-col
        bg-white border-2 transition-all duration-150
        ${isSelected
          ? 'border-blue-500 shadow-xl shadow-blue-500/20 ring-4 ring-blue-500/10'
          : 'border-gray-200 shadow-lg hover:shadow-xl hover:border-gray-300'
        }
        ${tab?.isFocused ? 'border-blue-400 shadow-xl shadow-blue-400/25' : ''}
      `}
    >
      {/* Header Bar - Clean macOS style */}
      <div
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        className="h-10 bg-gray-100 border-b border-gray-200 flex items-center gap-3 px-3 cursor-move shrink-0"
      >
        {/* Window Controls - macOS style */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleClose}
            className="w-3 h-3 rounded-full bg-red-400 hover:bg-red-500 transition-colors shadow-sm"
            title="Schließen"
          />
          <button
            onClick={() => {/* minimize not implemented */}}
            className="w-3 h-3 rounded-full bg-yellow-400 hover:bg-yellow-500 transition-colors shadow-sm"
            title="Minimieren"
          />
          <button
            onClick={handleFullscreen}
            className="w-3 h-3 rounded-full bg-green-400 hover:bg-green-500 transition-colors shadow-sm"
            title="Vollbild"
          />
        </div>

        {/* URL Bar - Clean design */}
        <div className="flex-1 flex items-center">
          <div className={`
            flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all
            ${isUrlFocused
              ? 'bg-white ring-2 ring-blue-500 shadow-sm'
              : 'bg-gray-200/80 hover:bg-gray-200'
            }
          `}>
            <Globe size={12} className="text-gray-400 shrink-0" />
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
              onClick={(e) => e.stopPropagation()}
              placeholder="URL eingeben..."
              className="flex-1 text-xs bg-transparent outline-none text-gray-700 placeholder-gray-400 min-w-0 font-medium"
            />
          </div>
        </div>

        {/* Fullscreen Button */}
        <button
          onClick={handleFullscreen}
          className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
          title="Vollbild"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Content Area - Der Webview sitzt hier */}
      <div
        className="flex-1 relative bg-white"
        onClick={handleTabClick}
        onDoubleClick={handleDoubleClick}
      >
        {/* Placeholder während Tab lädt oder keine URL */}
        {!item.url ? (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-200 flex items-center justify-center mx-auto mb-4">
                <Globe size={28} className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 font-medium">URL eingeben</p>
              <p className="text-xs text-gray-400 mt-1">um Webseite zu laden</p>
            </div>
          </div>
        ) : !tabCreated ? (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-600 font-medium">Lädt...</p>
              <p className="text-xs text-gray-400 mt-1 max-w-[200px] truncate">{item.url}</p>
            </div>
          </div>
        ) : (
          /* Der native Webview rendert hier - komplett transparent */
          <div className="absolute inset-0">
            {/* Interaction overlay nur wenn nicht fokussiert */}
            {!tab?.isFocused && (
              <div className="absolute inset-0 bg-transparent hover:bg-black/5 flex items-center justify-center opacity-0 hover:opacity-100 transition-all cursor-pointer">
                <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-700">Klicken zum Aktivieren</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resize Handle - Subtle corner */}
      <div
        className="absolute bottom-1 right-1 w-5 h-5 cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-end justify-end"
        onMouseDown={(e) => {
          e.stopPropagation();
          startResize(e, item.id);
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" className="text-gray-400">
          <path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  );
};

// Memoized export
export const WebTabItem = memo(WebTabItemComponent);
