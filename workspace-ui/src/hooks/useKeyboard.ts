import { useEffect } from 'react';
import { useUIStore, useCanvasStore } from '@/stores';
import { isMac } from '@/utils';

export const useKeyboard = () => {
  const { openAddModal } = useUIStore();
  const { clearSelection, removeItem, selectedIds } = useCanvasStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const modifier = isMac() ? e.metaKey : e.ctrlKey;

      // Cmd/Ctrl + N → Open Add Modal
      if (modifier && e.key === 'n') {
        e.preventDefault();
        openAddModal();
      }

      // Escape → Clear Selection
      if (e.key === 'Escape') {
        clearSelection();
      }

      // Delete/Backspace → Remove selected items
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Don't delete if we're in an input field
        if ((e.target as HTMLElement).tagName === 'INPUT' || 
            (e.target as HTMLElement).tagName === 'TEXTAREA') {
          return;
        }
        selectedIds.forEach((id) => removeItem(id));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openAddModal, clearSelection, selectedIds, removeItem]);
};


