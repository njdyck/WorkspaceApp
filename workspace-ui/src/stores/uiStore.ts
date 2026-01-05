import { create } from 'zustand';
import { FocusZone } from '@/types';

interface UIState {
  // Modals
  addModal: { open: boolean };
  sidePanel: { open: boolean; itemId: string | null };
  helpModal: { open: boolean };

  // Search
  searchOpen: boolean;
  searchQuery: string;

  // Context Menu
  contextMenu: {
    open: boolean;
    x: number;
    y: number;
    itemId: string | null;
  };

  // Focus Mode
  focusMode: boolean;
  focusZone: FocusZone | null;

  // Settings
  gridSnapping: boolean;
  darkMode: boolean;
  showMinimap: boolean;

  // Actions - Modals
  openAddModal: () => void;
  closeAddModal: () => void;
  openSidePanel: (itemId: string) => void;
  closeSidePanel: () => void;
  openHelpModal: () => void;
  closeHelpModal: () => void;

  // Actions - Search
  openSearch: () => void;
  closeSearch: () => void;
  setSearchQuery: (query: string) => void;

  // Actions - Context Menu
  openContextMenu: (x: number, y: number, itemId: string | null) => void;
  closeContextMenu: () => void;

  // Actions - Focus Mode
  toggleFocusMode: () => void;
  exitFocusMode: () => void;
  setFocusZone: (zone: FocusZone | null) => void;
  updateFocusZone: (updates: Partial<FocusZone>) => void;

  // Actions - Settings
  toggleGridSnapping: () => void;
  toggleDarkMode: () => void;
  toggleMinimap: () => void;
  setDarkMode: (enabled: boolean) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  // Initial State
  addModal: { open: false },
  sidePanel: { open: false, itemId: null },
  helpModal: { open: false },
  searchOpen: false,
  searchQuery: '',
  contextMenu: { open: false, x: 0, y: 0, itemId: null },
  focusMode: false,
  focusZone: null,
  gridSnapping: false,
  darkMode: false,
  showMinimap: true,

  // Modal Actions
  openAddModal: () => set({ addModal: { open: true } }),
  closeAddModal: () => set({ addModal: { open: false } }),

  openSidePanel: (itemId) => set({ sidePanel: { open: true, itemId } }),
  closeSidePanel: () => set({ sidePanel: { open: false, itemId: null } }),

  openHelpModal: () => set({ helpModal: { open: true } }),
  closeHelpModal: () => set({ helpModal: { open: false } }),

  // Search Actions
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false, searchQuery: '' }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Context Menu Actions
  openContextMenu: (x, y, itemId) => set({
    contextMenu: { open: true, x, y, itemId }
  }),
  closeContextMenu: () => set({
    contextMenu: { open: false, x: 0, y: 0, itemId: null }
  }),

  // Focus Mode Actions
  toggleFocusMode: () => {
    const { focusMode, focusZone } = get();
    if (!focusMode) {
      // Aktiviere Fokus-Modus mit Standard-Zone (Viewport-zentriert)
      const padding = 100;
      const defaultZone: FocusZone = {
        x: padding,
        y: padding,
        width: Math.max(600, window.innerWidth - padding * 4),
        height: Math.max(400, window.innerHeight - padding * 4),
      };
      set({ focusMode: true, focusZone: focusZone || defaultZone });
    } else {
      set({ focusMode: false });
    }
  },
  exitFocusMode: () => set({ focusMode: false }),
  setFocusZone: (zone) => set({ focusZone: zone }),
  updateFocusZone: (updates) => set((state) => ({
    focusZone: state.focusZone ? { ...state.focusZone, ...updates } : null
  })),

  // Settings Actions
  toggleGridSnapping: () => set((state) => ({ gridSnapping: !state.gridSnapping })),
  toggleDarkMode: () => set((state) => {
    const newDarkMode = !state.darkMode;
    // Update document class for Tailwind dark mode
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return { darkMode: newDarkMode };
  }),
  toggleMinimap: () => set((state) => ({ showMinimap: !state.showMinimap })),
  setDarkMode: (enabled) => {
    if (enabled) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ darkMode: enabled });
  },
}));
