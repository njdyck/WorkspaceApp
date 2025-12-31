import React, { useState } from 'react';
import { Plus, BrainCircuit, Globe, Search, MoreHorizontal, Sparkles, LayoutGrid, ArrowRight, X } from 'lucide-react';
import { useUIStore, useCanvasStore } from '@/stores';
import { autoClusterItems } from '@/services/clustering';
import { generateId } from '@/utils';
import { DEFAULT_WEBVIEW_WIDTH, DEFAULT_WEBVIEW_HEIGHT } from '@/models';

export const BottomToolbar: React.FC = () => {
  const { openAddModal } = useUIStore();
  const { items, updateItem, viewport, addItem } = useCanvasStore();
  const [showAIMenu, setShowAIMenu] = useState(false);
  const [isClustering, setIsClustering] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [showWebviewInput, setShowWebviewInput] = useState(false);
  const [webviewUrl, setWebviewUrl] = useState('https://');

  const handleAutoCluster = async (useAI: boolean = false) => {
    setIsClustering(true);
    setShowAIMenu(false);
    
    let positionCount = 0;
    
    try {
      const itemsArray = Array.from(items.values());
      
      // Canvas-Zentrum berechnen (basierend auf aktuellem Viewport)
      const canvasCenter = {
        x: -viewport.x + window.innerWidth / 2,
        y: -viewport.y + window.innerHeight / 2,
      };
      
      const positions = await autoClusterItems(itemsArray, {
        useAI: useAI && !!apiKey,
        apiKey: apiKey || undefined,
        canvasCenter,
      });
      
      positionCount = positions.length;
      
      // Positionen animiert anwenden
      positions.forEach((pos, index) => {
        // Verzögerung für Animation-Effekt
        setTimeout(() => {
          updateItem(pos.itemId, { x: pos.x, y: pos.y });
        }, index * 50);
      });
      
    } catch (error) {
      console.error('Clustering fehlgeschlagen:', error);
    } finally {
      setTimeout(() => setIsClustering(false), positionCount * 50 + 200);
    }
  };

  const handleCreateWebview = () => {
    // URL validieren und normalisieren
    let finalUrl = webviewUrl.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    // Position im Zentrum des Viewports
    const centerX = -viewport.x + window.innerWidth / 2;
    const centerY = -viewport.y + window.innerHeight / 2;
    const x = centerX - DEFAULT_WEBVIEW_WIDTH / 2;
    const y = centerY - DEFAULT_WEBVIEW_HEIGHT / 2;

    addItem({
      id: generateId(),
      content: new URL(finalUrl).hostname || 'Webview',
      x,
      y,
      width: DEFAULT_WEBVIEW_WIDTH,
      height: DEFAULT_WEBVIEW_HEIGHT,
      status: 'active',
      badge: 'webview',
      url: finalUrl,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    setShowWebviewInput(false);
    setWebviewUrl('https://');
  };

  const handleWebviewKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateWebview();
    } else if (e.key === 'Escape') {
      setShowWebviewInput(false);
      setWebviewUrl('https://');
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
      <div className="flex items-center gap-0.5 px-3 py-1.5 bg-white border border-gray-200 shadow-sm rounded-full transition-all hover:shadow-md">
        {/* Plus - Main Action */}
        <button
          onClick={openAddModal}
          className="group relative p-1.5 rounded-full hover:bg-gray-50 transition-colors flex items-center justify-center"
          aria-label="Hinzufügen"
        >
          <Plus
            size={20}
            className="text-gray-600 group-hover:text-gray-900 transition-colors"
            strokeWidth={1.5}
          />
        </button>

        <div className="w-px h-4 bg-gray-200 mx-1" />

        {/* AI / Intelligence */}
        <div className="relative">
          <button
            onClick={() => setShowAIMenu(!showAIMenu)}
            className={`group p-1.5 rounded-full transition-colors flex items-center justify-center ${
              isClustering ? 'bg-purple-100' : 'hover:bg-gray-50'
            }`}
            aria-label="KI-Funktionen"
            disabled={isClustering}
          >
            <BrainCircuit
              size={18}
              className={`transition-colors ${
                isClustering 
                  ? 'text-purple-600 animate-pulse' 
                  : 'text-gray-500 group-hover:text-gray-800'
              }`}
              strokeWidth={1.5}
            />
          </button>

          {/* AI Menu Popup */}
          {showAIMenu && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="p-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-800">KI-Funktionen</h3>
                <p className="text-xs text-gray-500 mt-0.5">Automatische Organisation</p>
              </div>
              
              <div className="p-2">
                {/* Keyword-basiertes Clustering */}
                <button
                  onClick={() => handleAutoCluster(false)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <LayoutGrid size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-800">Auto-Cluster</div>
                    <div className="text-xs text-gray-500">Nach Keywords gruppieren</div>
                  </div>
                </button>

                {/* AI-basiertes Clustering */}
                <button
                  onClick={() => {
                    if (apiKey) {
                      handleAutoCluster(true);
                    } else {
                      setShowApiKeyInput(true);
                    }
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-purple-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                    <Sparkles size={16} className="text-purple-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-800">KI-Clustering</div>
                    <div className="text-xs text-gray-500">Mit OpenAI Embeddings</div>
                  </div>
                </button>

                {/* API Key Input */}
                {showApiKeyInput && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                    <input
                      type="password"
                      placeholder="OpenAI API Key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full text-xs px-2 py-1.5 rounded border border-gray-200 focus:border-purple-400 outline-none"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setShowApiKeyInput(false)}
                        className="flex-1 text-xs py-1 rounded bg-gray-200 text-gray-600 hover:bg-gray-300"
                      >
                        Abbrechen
                      </button>
                      <button
                        onClick={() => {
                          if (apiKey) {
                            handleAutoCluster(true);
                            setShowApiKeyInput(false);
                          }
                        }}
                        className="flex-1 text-xs py-1 rounded bg-purple-600 text-white hover:bg-purple-700"
                      >
                        Starten
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Webviews */}
        <div className="relative">
          <button
            onClick={() => setShowWebviewInput(!showWebviewInput)}
            className={`group p-1.5 rounded-full transition-colors flex items-center justify-center ${
              showWebviewInput ? 'bg-cyan-100' : 'hover:bg-gray-50'
            }`}
            aria-label="Webview erstellen"
          >
            <Globe
              size={18}
              className={`transition-colors ${
                showWebviewInput 
                  ? 'text-cyan-600' 
                  : 'text-gray-500 group-hover:text-gray-800'
              }`}
              strokeWidth={1.5}
            />
          </button>

          {/* Webview URL Input Popup */}
          {showWebviewInput && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="p-3 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Globe size={16} className="text-cyan-600" />
                  <h3 className="text-sm font-semibold text-gray-800">Live Webview</h3>
                </div>
                <button
                  onClick={() => {
                    setShowWebviewInput(false);
                    setWebviewUrl('https://');
                  }}
                  className="text-gray-400 hover:text-gray-600 p-0.5 rounded hover:bg-gray-100"
                >
                  <X size={14} />
                </button>
              </div>
              
              <div className="p-3">
                <div className="flex gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={webviewUrl}
                    onChange={(e) => setWebviewUrl(e.target.value)}
                    onKeyDown={handleWebviewKeyDown}
                    placeholder="URL eingeben..."
                    className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 outline-none transition-all"
                  />
                  <button
                    onClick={handleCreateWebview}
                    className="px-3 py-2 rounded-lg bg-cyan-600 text-white hover:bg-cyan-700 transition-colors flex items-center gap-1"
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Erstellt eine interaktive Webansicht auf dem Canvas
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        <button
          className="group p-1.5 rounded-full hover:bg-gray-50 transition-colors flex items-center justify-center"
          aria-label="Suche"
        >
          <Search
            size={18}
            className="text-gray-500 group-hover:text-gray-800 transition-colors"
            strokeWidth={1.5}
          />
        </button>

        <div className="w-px h-4 bg-gray-200 mx-1" />

        {/* More */}
        <button
          className="group p-1.5 rounded-full hover:bg-gray-50 transition-colors flex items-center justify-center"
          aria-label="Mehr"
        >
          <MoreHorizontal
            size={18}
            className="text-gray-500 group-hover:text-gray-800 transition-colors"
            strokeWidth={1.5}
          />
        </button>
      </div>

      {/* Click outside to close menus */}
      {(showAIMenu || showWebviewInput) && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => {
            setShowAIMenu(false);
            setShowApiKeyInput(false);
            setShowWebviewInput(false);
            setWebviewUrl('https://');
          }}
        />
      )}
    </div>
  );
};
