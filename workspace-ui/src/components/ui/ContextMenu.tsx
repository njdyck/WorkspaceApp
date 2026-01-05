import React, { useEffect, useRef } from 'react';
import { Copy, Trash2, Link2, Edit3, Layers } from 'lucide-react';
import { useUIStore, useCanvasStore } from '@/stores';

export const ContextMenu: React.FC = () => {
  const contextMenu = useUIStore((s) => s.contextMenu);
  const closeContextMenu = useUIStore((s) => s.closeContextMenu);
  const openSidePanel = useUIStore((s) => s.openSidePanel);

  const duplicateItem = useCanvasStore((s) => s.duplicateItem);
  const removeItem = useCanvasStore((s) => s.removeItem);
  const startConnecting = useCanvasStore((s) => s.startConnecting);
  const select = useCanvasStore((s) => s.select);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };

    if (contextMenu.open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [contextMenu.open, closeContextMenu]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeContextMenu();
      }
    };

    if (contextMenu.open) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [contextMenu.open, closeContextMenu]);

  if (!contextMenu.open) return null;

  const handleDuplicate = () => {
    if (contextMenu.itemId) {
      duplicateItem(contextMenu.itemId);
    }
    closeContextMenu();
  };

  const handleDelete = () => {
    if (contextMenu.itemId) {
      removeItem(contextMenu.itemId);
    }
    closeContextMenu();
  };

  const handleConnect = () => {
    if (contextMenu.itemId) {
      select([contextMenu.itemId]);
      startConnecting(contextMenu.itemId);
    }
    closeContextMenu();
  };

  const handleEdit = () => {
    if (contextMenu.itemId) {
      openSidePanel(contextMenu.itemId);
    }
    closeContextMenu();
  };

  // Adjust position to stay within viewport
  const adjustedX = Math.min(contextMenu.x, window.innerWidth - 200);
  const adjustedY = Math.min(contextMenu.y, window.innerHeight - 250);

  return (
    <div
      ref={menuRef}
      style={{
        left: adjustedX,
        top: adjustedY,
      }}
      className="fixed z-50 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 overflow-hidden"
    >
      {contextMenu.itemId ? (
        // Item Context Menu
        <>
          <button
            onClick={handleEdit}
            className="w-full px-3 py-2 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Edit3 size={16} className="text-gray-500" />
            Bearbeiten
          </button>
          <button
            onClick={handleDuplicate}
            className="w-full px-3 py-2 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Copy size={16} className="text-gray-500" />
            Duplizieren
            <span className="ml-auto text-xs text-gray-400">⌘D</span>
          </button>
          <button
            onClick={handleConnect}
            className="w-full px-3 py-2 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Link2 size={16} className="text-gray-500" />
            Verbinden
          </button>
          <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
          <button
            onClick={handleDelete}
            className="w-full px-3 py-2 flex items-center gap-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 size={16} />
            Löschen
            <span className="ml-auto text-xs">⌫</span>
          </button>
        </>
      ) : (
        // Canvas Context Menu (no item selected)
        <>
          <button
            onClick={() => {
              useUIStore.getState().openAddModal();
              closeContextMenu();
            }}
            className="w-full px-3 py-2 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Layers size={16} className="text-gray-500" />
            Neues Item
            <span className="ml-auto text-xs text-gray-400">⌘N</span>
          </button>
        </>
      )}
    </div>
  );
};
