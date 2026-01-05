import React, { useEffect, useRef, useMemo } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { useUIStore, useCanvasStore } from '@/stores';

export const SearchPanel: React.FC = () => {
  const searchOpen = useUIStore((s) => s.searchOpen);
  const searchQuery = useUIStore((s) => s.searchQuery);
  const setSearchQuery = useUIStore((s) => s.setSearchQuery);
  const closeSearch = useUIStore((s) => s.closeSearch);

  const items = useCanvasStore((s) => s.items);
  const select = useCanvasStore((s) => s.select);
  const setViewport = useCanvasStore((s) => s.setViewport);
  const viewport = useCanvasStore((s) => s.viewport);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchOpen]);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return Array.from(items.values()).filter((item) =>
      item.content.toLowerCase().includes(query) ||
      item.badge?.toLowerCase().includes(query) ||
      item.status?.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  const handleSelectItem = (itemId: string) => {
    const item = items.get(itemId);
    if (!item) return;

    // Select the item
    select([itemId]);

    // Pan to center the item in viewport
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const itemCenterX = item.x + item.width / 2;
    const itemCenterY = item.y + item.height / 2;

    setViewport({
      x: centerX - itemCenterX * viewport.scale,
      y: centerY - itemCenterY * viewport.scale,
    });

    closeSearch();
  };

  if (!searchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeSearch}
      />

      {/* Search Panel */}
      <div className="relative w-full max-w-xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <Search size={20} className="text-gray-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Items suchen..."
            className="flex-1 bg-transparent outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400"
          />
          <button
            onClick={closeSearch}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {searchQuery.trim() && filteredItems.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              Keine Items gefunden
            </div>
          )}

          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelectItem(item.id)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                  {item.content}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {item.badge && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                      {item.badge}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {item.status}
                  </span>
                </div>
              </div>
              <ArrowRight size={16} className="text-gray-400" />
            </button>
          ))}
        </div>

        {/* Hint */}
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400 flex items-center gap-4">
          <span><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Enter</kbd> Auswählen</span>
          <span><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Esc</kbd> Schließen</span>
        </div>
      </div>
    </div>
  );
};
