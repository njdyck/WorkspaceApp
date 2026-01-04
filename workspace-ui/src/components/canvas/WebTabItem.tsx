import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Globe, X, Maximize2, Minimize2, ExternalLink } from 'lucide-react';
import { CanvasItem as CanvasItemType } from '@/models';
import { useCanvasStore } from '@/stores';
import { useWebTabStore } from '@/stores/webTabStore';
import { useItemDrag, useItemResize } from '@/hooks';

// ============================================================================
// WEB TAB ITEM - Canvas-Karte die native Webview synchronisiert
// ============================================================================

interface WebTabItemProps {
  item: CanvasItemType;
}

export const WebTabItem: React.FC<WebTabItemProps> = ({ item }) => {
  const { viewport, selectedIds, updateItem, removeItem } = useCanvasStore();
  const { 
    createTab, 
    updateTabBounds, 
    closeTab, 
    focusTab, 
    unfocusAllTabs,
    setTabFullscreen,
    getTabByItemId,
  } = useWebTabStore();
  
  const { startDrag } = useItemDrag();
  const { startResize } = useItemResize();
  
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
  const rafRef = useRef<number>();
  const lastBoundsRef = useRef<string>('');
  const creatingTabRef = useRef<boolean>(false); // Verhindert mehrfache Tab-Erstellung

  // ============================================================================
  // BOUNDS CALCULATION - Canvas-Koordinaten zu Screen-Koordinaten
  // ============================================================================
  
  const calculateScreenBounds = useCallback(() => {
    // Canvas-Position zu Screen-Position konvertieren
    // viewport.x/y sind die Offset-Werte, scale ist der Zoom
    const screenX = (item.x * viewport.scale) + viewport.x;
    const screenY = (item.y * viewport.scale) + viewport.y;
    const screenWidth = item.width * viewport.scale;
    const screenHeight = item.height * viewport.scale;
    
    // Header-Höhe des Tab-Items (36px) + App-Toolbar (48px)
    const tabHeaderHeight = 36;
    const appToolbarHeight = 48;
    
    return {
      x: Math.round(screenX),
      y: Math.round(screenY + tabHeaderHeight + appToolbarHeight),
      width: Math.round(Math.max(screenWidth, 100)),
      height: Math.round(Math.max(screenHeight - tabHeaderHeight, 100)),
    };
  }, [item.x, item.y, item.width, item.height, viewport.x, viewport.y, viewport.scale]);

  // ============================================================================
  // TAB CREATION & SYNC
  // ============================================================================

  // Tab erstellen wenn URL vorhanden und noch nicht erstellt ODER URL geändert hat
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/825b47f8-8cbf-4779-8539-e25d48125528',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WebTabItem.tsx:76',message:'Tab creation effect triggered',data:{itemId:item.id,itemUrl:item.url,tabCreated,itemX:item.x,itemY:item.y},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    const existingTab = getTabByItemId(item.id);
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/825b47f8-8cbf-4779-8539-e25d48125528',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WebTabItem.tsx:79',message:'Existing tab check',data:{itemId:item.id,existingTab:!!existingTab,existingTabId:existingTab?.id,existingTabUrl:existingTab?.url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    // Wenn Tab bereits existiert und URL gleich ist, nichts tun
    if (existingTab && existingTab.url === item.url) {
      if (!tabCreated) {
        setTabCreated(true);
      }
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/825b47f8-8cbf-4779-8539-e25d48125528',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WebTabItem.tsx:85',message:'Tab exists, early return',data:{itemId:item.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return;
    }
    
    // Wenn Tab existiert aber URL anders ist, Tab schließen und neu erstellen
    if (existingTab && existingTab.url !== item.url) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/825b47f8-8cbf-4779-8539-e25d48125528',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WebTabItem.tsx:88',message:'Tab URL changed, closing',data:{itemId:item.id,oldUrl:existingTab.url,newUrl:item.url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
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
    
    // Tab erstellen wenn noch nicht vorhanden und noch nicht erstellt
    if (!tabCreated && !existingTab && !creatingTabRef.current) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/825b47f8-8cbf-4779-8539-e25d48125528',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WebTabItem.tsx:105',message:'Creating new tab',data:{itemId:item.id,url:item.url,tabCreated,existingTab:!!existingTab,creatingTab:creatingTabRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      creatingTabRef.current = true; // Flag setzen um mehrfache Erstellung zu verhindern
      const bounds = calculateScreenBounds();
      
      createTab(item.id, item.url, bounds).then((tabId) => {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/825b47f8-8cbf-4779-8539-e25d48125528',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WebTabItem.tsx:108',message:'Tab created callback',data:{itemId:item.id,tabId,success:!!tabId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        creatingTabRef.current = false; // Flag zurücksetzen
        if (tabId) {
          setTabCreated(true);
        } else {
          // Falls Fehler, Flag zurücksetzen damit Retry möglich ist
          creatingTabRef.current = false;
        }
      }).catch((error) => {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/825b47f8-8cbf-4779-8539-e25d48125528',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WebTabItem.tsx:115',message:'Tab creation failed',data:{itemId:item.id,error:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        creatingTabRef.current = false; // Flag zurücksetzen bei Fehler
      });
    }
  }, [item.url, item.id, tabCreated, createTab, getTabByItemId, closeTab]); // calculateScreenBounds entfernt aus Dependencies

  // Bounds synchronisieren wenn sich Position/Größe/Viewport ändert
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/825b47f8-8cbf-4779-8539-e25d48125528',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WebTabItem.tsx:108',message:'Bounds sync effect triggered',data:{itemId:item.id,hasTab:!!tab,isFullscreen:tab?.isFullscreen,itemX:item.x,itemY:item.y},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    if (!tab || tab.isFullscreen) return;

    const bounds = calculateScreenBounds();
    const boundsKey = JSON.stringify(bounds);
    
    // Nur updaten wenn sich wirklich was geändert hat
    if (boundsKey === lastBoundsRef.current) return;
    lastBoundsRef.current = boundsKey;

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/825b47f8-8cbf-4779-8539-e25d48125528',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WebTabItem.tsx:118',message:'Updating tab bounds',data:{tabId:tab.id,bounds,itemX:item.x,itemY:item.y},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    // RAF für Performance
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    rafRef.current = requestAnimationFrame(() => {
      updateTabBounds(tab.id, bounds);
    });

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [tab, calculateScreenBounds, updateTabBounds, item.x, item.y, item.width, item.height]);

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
      // Tab wurde geschlossen, reset state
      setTabCreated(false);
    }
  }, [tab, tabCreated]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    unfocusAllTabs(); // Canvas-Click = unfocus alle Tabs
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
      // Tab wird durch useEffect neu erstellt
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
        className="absolute bg-slate-900/50 rounded-xl border border-cyan-500/50 flex items-center justify-center backdrop-blur-sm"
      >
        <div className="text-center text-white/60">
          <Maximize2 size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Fullscreen</p>
          <p className="text-xs opacity-60">ESC zum Beenden</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
      }}
      className={`
        absolute bg-slate-900 rounded-xl border overflow-hidden select-none group flex flex-col
        shadow-2xl shadow-black/50 transition-shadow
        ${isSelected 
          ? 'border-cyan-500 ring-2 ring-cyan-500/30' 
          : 'border-slate-700 hover:border-slate-600'
        }
        ${tab?.isFocused ? 'ring-2 ring-cyan-400/50 border-cyan-400' : ''}
      `}
    >
      {/* Header Bar - Draggable */}
      <div
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        className="h-9 bg-slate-800 border-b border-slate-700 flex items-center gap-2 px-2.5 cursor-move shrink-0"
      >
        {/* Window Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleClose}
            className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors"
            title="Schließen"
          />
          <button
            onClick={() => {/* minimize not implemented */}}
            className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors"
            title="Minimieren"
          />
          <button
            onClick={handleFullscreen}
            className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors"
            title="Fullscreen"
          />
        </div>

        {/* URL Bar */}
        <div className="flex-1 flex items-center ml-2">
          <div className={`
            flex-1 flex items-center gap-2 px-2.5 py-1 rounded-md transition-all
            ${isUrlFocused 
              ? 'bg-slate-600 ring-1 ring-cyan-500' 
              : 'bg-slate-700/80 hover:bg-slate-700'
            }
          `}>
            <Globe size={11} className="text-slate-400 shrink-0" />
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
              className="flex-1 text-xs bg-transparent outline-none text-slate-200 placeholder-slate-500 min-w-0"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={handleFullscreen}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-cyan-400 transition-colors"
            title={tab?.isFullscreen ? 'Fullscreen beenden' : 'Fullscreen'}
          >
            {tab?.isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </div>

      {/* Content Area - Click to focus tab */}
      <div 
        className="flex-1 relative cursor-pointer"
        onClick={handleTabClick}
        onDoubleClick={handleDoubleClick}
      >
        {/* Placeholder während Tab lädt oder keine URL */}
        {!item.url ? (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
            <div className="text-center">
              <Globe size={40} className="mx-auto mb-3 text-slate-600" />
              <p className="text-sm text-slate-500">URL eingeben</p>
            </div>
          </div>
        ) : !tabCreated ? (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-400">Lade Webview...</p>
            </div>
          </div>
        ) : (
          /* Transparentes Overlay - Webview ist dahinter */
          <div className="absolute inset-0 bg-transparent">
            {/* Focus Indicator */}
            {!tab?.isFocused && (
              <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <div className="text-center text-white">
                  <p className="text-sm font-medium">Klicken zum Aktivieren</p>
                  <p className="text-xs opacity-60 mt-1">Doppelklick für Fullscreen</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resize Handle */}
      <div
        className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize opacity-0 group-hover:opacity-100 hover:opacity-100 flex items-end justify-end p-1.5 z-10"
        onMouseDown={(e) => {
          e.stopPropagation();
          startResize(e, item.id);
        }}
      >
        <div className="w-2.5 h-2.5 border-r-2 border-b-2 border-slate-500 rounded-br-sm" />
      </div>
    </div>
  );
};

