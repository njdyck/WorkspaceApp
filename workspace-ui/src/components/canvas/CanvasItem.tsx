import React, { useState } from 'react';
import { Link2, Globe, Maximize2, Play } from 'lucide-react';
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

  const handleOpenNativeWebview = async () => {
    if (!item.url) return;

    try {
      await invoke('open_webview_window', {
        url: item.url,
        title: item.content || 'Webview',
        width: item.width,
        height: item.height,
      });
    } catch (error) {
      console.error('Failed to open Tauri webview:', error);
    }
  };

  const handleCloseWebview = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeItem(item.id);
  };

  // Webview Rendering (Dark Theme)
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
          absolute bg-slate-900 rounded-xl border overflow-hidden select-none group flex flex-col shadow-2xl shadow-black/50
          ${isSelected 
            ? 'border-cyan-500 ring-2 ring-cyan-500/30' 
            : 'border-slate-700 hover:border-slate-600'
          }
          ${canBeTarget ? 'ring-2 ring-green-400/50 border-green-500' : ''}
          ${isConnectingFrom ? 'ring-2 ring-blue-400/50 border-blue-500' : ''}
        `}
      >
        {/* Header Bar - Draggable (Dark Theme) */}
        <div
          onMouseDown={handleMouseDown}
          className="h-9 bg-slate-800 border-b border-slate-700 flex items-center gap-2 px-2.5 cursor-move shrink-0"
        >
          {/* Window Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCloseWebview}
              className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors"
              title="Schließen"
            />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <button
              onClick={(e) => { e.stopPropagation(); handleOpenNativeWebview(); }}
              className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors"
              title="Webview öffnen"
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
                placeholder="URL eingeben..."
                className="flex-1 text-xs bg-transparent outline-none text-slate-200 placeholder-slate-500 min-w-0"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); handleOpenNativeWebview(); }}
              className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-cyan-400 transition-colors"
              title="Webview öffnen"
            >
              <Maximize2 size={12} />
            </button>
            <button
              onClick={handleStartConnection}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-cyan-400 transition-all"
              title="Verbindung erstellen"
            >
              <Link2 size={12} />
            </button>
          </div>
        </div>

        {/* Content Area - Click to open Webview */}
        <div 
          className="flex-1 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden flex items-center justify-center cursor-pointer group/content"
          onMouseDown={handleMouseDown}
          onDoubleClick={(e) => {
            e.stopPropagation();
            handleOpenNativeWebview();
          }}
        >
          {item.url ? (
            <div className="text-center p-4">
              {/* Animated Globe Icon */}
              <div className="relative mb-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30 group-hover/content:scale-110 transition-transform">
                  <Globe size={32} className="text-white" />
                </div>
                {/* Play overlay on hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/content:opacity-100 transition-opacity">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Play size={24} className="text-white ml-1" fill="white" />
                  </div>
                </div>
              </div>
              
              <h3 className="text-white font-semibold text-base mb-1 truncate max-w-full">
                {item.content}
              </h3>
              <p className="text-slate-400 text-xs truncate max-w-full mb-4">
                {item.url}
              </p>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenNativeWebview();
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/40 hover:scale-105 transition-all flex items-center gap-2 mx-auto text-sm"
              >
                <Maximize2 size={16} />
                <span>Webview öffnen</span>
              </button>
            </div>
          ) : (
            <div className="text-center">
              <Globe size={40} className="mx-auto mb-3 text-slate-600" />
              <p className="text-sm text-slate-500">URL eingeben</p>
            </div>
          )}
        </div>

        {/* Resize Handle */}
        <div
          className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize opacity-0 group-hover:opacity-100 hover:opacity-100 flex items-end justify-end p-1.5 z-10"
          onMouseDown={(e) => startResize(e, item.id)}
        >
          <div className="w-2.5 h-2.5 border-r-2 border-b-2 border-slate-500 rounded-br-sm"></div>
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
