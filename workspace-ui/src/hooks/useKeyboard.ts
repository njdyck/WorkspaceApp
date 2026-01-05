import { useEffect, useCallback } from 'react';
import { useUIStore, useCanvasStore } from '@/stores';
import { isMac } from '@/utils';

export const useKeyboard = () => {
  // Granulare Selektoren für stabile Referenzen
  const openAddModal = useUIStore((s) => s.openAddModal);
  const openSearch = useUIStore((s) => s.openSearch);
  const closeSearch = useUIStore((s) => s.closeSearch);
  const searchOpen = useUIStore((s) => s.searchOpen);
  const openHelpModal = useUIStore((s) => s.openHelpModal);
  const toggleDarkMode = useUIStore((s) => s.toggleDarkMode);
  const toggleGridSnapping = useUIStore((s) => s.toggleGridSnapping);
  const toggleFocusMode = useUIStore((s) => s.toggleFocusMode);
  const exitFocusMode = useUIStore((s) => s.exitFocusMode);
  const focusMode = useUIStore((s) => s.focusMode);

  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const removeItem = useCanvasStore((s) => s.removeItem);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const duplicateSelected = useCanvasStore((s) => s.duplicateSelected);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const modifier = isMac() ? e.metaKey : e.ctrlKey;
    const isInputField = (e.target as HTMLElement).tagName === 'INPUT' ||
                         (e.target as HTMLElement).tagName === 'TEXTAREA';

    // Cmd/Ctrl + N → Open Add Modal
    if (modifier && e.key === 'n' && !isInputField) {
      e.preventDefault();
      openAddModal();
    }

    // Cmd/Ctrl + F or Cmd/Ctrl + K → Open Search
    if (modifier && (e.key === 'f' || e.key === 'k') && !isInputField) {
      e.preventDefault();
      if (searchOpen) {
        closeSearch();
      } else {
        openSearch();
      }
    }

    // Cmd/Ctrl + Z → Undo
    if (modifier && e.key === 'z' && !e.shiftKey && !isInputField) {
      e.preventDefault();
      undo();
    }

    // Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y → Redo
    if ((modifier && e.key === 'z' && e.shiftKey) || (modifier && e.key === 'y')) {
      if (!isInputField) {
        e.preventDefault();
        redo();
      }
    }

    // Cmd/Ctrl + D → Duplicate Selected
    if (modifier && e.key === 'd' && !isInputField) {
      e.preventDefault();
      duplicateSelected();
    }

    // Cmd/Ctrl + G → Toggle Grid Snapping
    if (modifier && e.key === 'g' && !isInputField) {
      e.preventDefault();
      toggleGridSnapping();
    }

    // ? or Cmd/Ctrl + / → Open Help Modal
    if ((e.key === '?' || (modifier && e.key === '/')) && !isInputField) {
      e.preventDefault();
      openHelpModal();
    }

    // Cmd/Ctrl + Shift + D → Toggle Dark Mode
    if (modifier && e.shiftKey && e.key === 'd') {
      e.preventDefault();
      toggleDarkMode();
    }

    // Cmd/Ctrl + . → Toggle Focus Mode
    if (modifier && e.key === '.' && !isInputField) {
      e.preventDefault();
      toggleFocusMode();
    }

    // Escape → Exit Focus Mode first, then Close Search, then Clear Selection
    if (e.key === 'Escape') {
      if (focusMode) {
        exitFocusMode();
      } else if (searchOpen) {
        closeSearch();
      } else {
        clearSelection();
      }
    }

    // Delete/Backspace → Remove selected items
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (!isInputField) {
        const currentSelectedIds = useCanvasStore.getState().selectedIds;
        currentSelectedIds.forEach((id) => removeItem(id));
      }
    }
  }, [
    openAddModal, openSearch, closeSearch, searchOpen, openHelpModal,
    toggleDarkMode, toggleGridSnapping, toggleFocusMode, exitFocusMode, focusMode,
    clearSelection, removeItem, undo, redo, duplicateSelected
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

