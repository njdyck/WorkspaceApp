import React, { useState } from 'react';
import { Link2, Globe, RefreshCw, X, ExternalLink, Maximize2 } from 'lucide-react';
import { CanvasItem as CanvasItemType } from '@/models';
import { useCanvasStore, useUIStore } from '@/stores';
import { useItemDrag, useItemResize } from '@/hooks';
import { invoke } from '@tauri-apps/api/core';

interface CanvasItemProps {
  item: CanvasItemType;
}

export const CanvasItem: React.FC<CanvasItemProps> = ({ item }) => {
  const { selectedIds, isConnecting, connectingFromId, startConnecting, finishConnecting, updateItem, removeItem } = useCanvasStore();
  const { openSidePanel } = useUIStore();
  const { startDrag } = useItemDrag();
  const { startResize } = useItemResize();
  
  // Webview-spezifischer State
  const [urlInput, setUrlInput] = useState(item.url || '');
  const [isUrlFocused, setIsUrlFocused] = useState(false);

  const isSelected = selectedIds.has(item.id);
  const isGroup = item.badge === 'group';
  const isWebview = item.badge === 'webview';
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

  // Webview-spezifische Funktionen
  const handleUrlSubmit = () => {
    let finalUrl = urlInput.trim();
    if (finalUrl && !finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }
    if (finalUrl) {
      updateItem(item.id, { url: finalUrl, content: new URL(finalUrl).hostname });
      setUrlInput(finalUrl);
    }
  };

  const handleUrlKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUrlSubmit();
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'Escape') {
      setUrlInput(item.url || '');
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleOpenExternal = () => {
    if (item.url) {
      window.open(item.url, '_blank');
    }
  };

  const handleOpenNativeWebview = async () => {
    if (item.url) {
      try {
        await invoke('open_webview_window', {
          url: item.url,
          title: item.content || 'Webview',
          width: item.width,
          height: item.height,
        });
      } catch (error) {
        console.error('Failed to open webview:', error);
        // Fallback to browser
        window.open(item.url, '_blank');
      }
    }
  };

  const handleRefresh = () => {
    // Öffnet die Webview neu
    handleOpenNativeWebview();
  };

  const handleCloseWebview = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeItem(item.id);
  };

  // Webview Rendering
  if (isWebview) {
    return (
      <div
        style={{
          left: item.x,
          top: item.y,
          width: item.width,
          height: item.height,
        }}
        className={`
          absolute bg-white rounded-xl border-2 overflow-hidden select-none group flex flex-col
          ${isSelected 
            ? 'border-cyan-400 shadow-xl ring-2 ring-cyan-100' 
            : 'border-gray-200 shadow-lg hover:shadow-xl hover:border-gray-300'
          }
          ${canBeTarget ? 'ring-2 ring-green-300 border-green-400' : ''}
          ${isConnectingFrom ? 'ring-2 ring-blue-300 border-blue-400' : ''}
        `}
      >
        {/* Header Bar - Draggable */}
        <div
          onMouseDown={handleMouseDown}
          className="h-10 bg-gradient-to-b from-gray-50 to-gray-100 border-b border-gray-200 flex items-center gap-2 px-2 cursor-move shrink-0"
        >
          {/* Window Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCloseWebview}
              className="w-3 h-3 rounded-full bg-red-400 hover:bg-red-500 transition-colors"
              title="Schließen"
            />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <button
              onClick={handleOpenExternal}
              className="w-3 h-3 rounded-full bg-green-400 hover:bg-green-500 transition-colors"
              title="Extern öffnen"
            />
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-0.5 ml-1">
            <button
              onClick={handleRefresh}
              className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
              title="Neu laden"
            >
              <RefreshCw size={12} />
            </button>
          </div>

          {/* URL Bar */}
          <div className="flex-1 flex items-center">
            <div className={`
              flex-1 flex items-center gap-2 px-2 py-1 rounded-md transition-all
              ${isUrlFocused 
                ? 'bg-white border border-cyan-300 shadow-sm' 
                : 'bg-gray-200/60 border border-transparent hover:bg-gray-200'
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
                placeholder="URL eingeben..."
                className="flex-1 text-xs bg-transparent outline-none text-gray-700 placeholder-gray-400 min-w-0"
              />
            </div>
          </div>

          {/* External Link */}
          <button
            onClick={handleOpenExternal}
            className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
            title="In neuem Tab öffnen"
          >
            <ExternalLink size={12} />
          </button>

          {/* Connection Button */}
          <button
            onClick={handleStartConnection}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-cyan-600 transition-all"
            title="Verbindung erstellen"
          >
            <Link2 size={12} />
          </button>
        </div>

        {/* Content Area */}
        <div 
          className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden flex items-center justify-center"
          onMouseDown={handleMouseDown}
          onDoubleClick={(e) => {
            e.stopPropagation();
            handleOpenNativeWebview();
          }}
        >
          {item.url ? (
            <div className="text-center p-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Globe size={40} className="text-white" />
              </div>
              <h3 className="text-gray-800 font-semibold text-lg mb-1 truncate max-w-full px-4">
                {item.content}
              </h3>
              <p className="text-gray-500 text-sm mb-6 truncate max-w-full px-4">
                {item.url}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenNativeWebview();
                }}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2 mx-auto"
              >
                <Maximize2 size={18} />
                <span>Im Fenster öffnen</span>
              </button>
              <p className="text-gray-400 text-xs mt-4">
                Doppelklick oder Button zum Öffnen
              </p>
            </div>
          ) : (
            <div className="text-center">
              <Globe size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-400">URL eingeben um Webseite zu laden</p>
            </div>
          )}
        </div>

        {/* Resize Handle */}
        <div
          className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize opacity-0 group-hover:opacity-100 hover:opacity-100 flex items-end justify-end p-1.5 z-10"
          onMouseDown={(e) => startResize(e, item.id)}
        >
          <div className="w-2.5 h-2.5 border-r-2 border-b-2 border-gray-400 rounded-br-sm"></div>
        </div>
      </div>
    );
  }

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
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        style={{
          left: item.x,
          top: item.y,
          width: item.width,
          height: item.height,
          backgroundColor: bgColor,
          borderColor: borderColor,
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
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      style={{
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
      }}
      className={`
        absolute bg-white rounded-lg border p-4 cursor-pointer transition-shadow select-none group z-10
        ${isSelected 
          ? 'border-blue-400 shadow-md ring-2 ring-blue-100' 
          : 'border-gray-100 shadow-sm hover:shadow-md'
        }
        ${canBeTarget ? 'ring-2 ring-green-300 border-green-400 shadow-lg' : ''}
        ${isConnectingFrom ? 'ring-2 ring-blue-300 border-blue-400' : ''}
      `}
    >
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-gray-800 font-medium text-sm truncate flex-1 mr-2">
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
