import { create } from 'zustand';
import { FocusZone } from '@/types';
import { GeneratedTask, GeneratedBoard } from '@/services/ai';

interface UIState {
  // Modals
  addModal: { open: boolean };
  sidePanel: { open: boolean; itemId: string | null };
  helpModal: { open: boolean };
  taskGenerationModal: {
    open: boolean;
    loading: boolean;
    tasks: GeneratedTask[];
    summary: string;
    error: string | null;
  };
  boardGenerationModal: {
    open: boolean;
    loading: boolean;
    board: GeneratedBoard | null;
    error: string | null;
  };
  toolProfilesModal: { open: boolean };

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
  openTaskGenerationModal: () => void;
  closeTaskGenerationModal: () => void;
  setTaskGenerationLoading: (loading: boolean) => void;
  setTaskGenerationResult: (tasks: GeneratedTask[], summary: string) => void;
  setTaskGenerationError: (error: string | null) => void;
  openBoardGenerationModal: () => void;
  closeBoardGenerationModal: () => void;
  setBoardGenerationLoading: (loading: boolean) => void;
  setBoardGenerationResult: (board: GeneratedBoard) => void;
  setBoardGenerationError: (error: string | null) => void;
  clearBoardGenerationResult: () => void;
  openToolProfilesModal: () => void;
  closeToolProfilesModal: () => void;

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
  taskGenerationModal: { open: false, loading: false, tasks: [], summary: '', error: null },
  boardGenerationModal: { open: false, loading: false, board: null, error: null },
  toolProfilesModal: { open: false },
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

  openTaskGenerationModal: () => set({
    taskGenerationModal: { open: true, loading: false, tasks: [], summary: '', error: null }
  }),
  closeTaskGenerationModal: () => set({
    taskGenerationModal: { open: false, loading: false, tasks: [], summary: '', error: null }
  }),
  setTaskGenerationLoading: (loading) => set((state) => ({
    taskGenerationModal: { ...state.taskGenerationModal, loading, error: null }
  })),
  setTaskGenerationResult: (tasks, summary) => set((state) => ({
    taskGenerationModal: { ...state.taskGenerationModal, loading: false, tasks, summary, error: null }
  })),
  setTaskGenerationError: (error) => set((state) => ({
    taskGenerationModal: { ...state.taskGenerationModal, loading: false, error }
  })),

  openBoardGenerationModal: () => set({
    boardGenerationModal: { open: true, loading: false, board: null, error: null }
  }),
  closeBoardGenerationModal: () => set({
    boardGenerationModal: { open: false, loading: false, board: null, error: null }
  }),
  setBoardGenerationLoading: (loading) => set((state) => ({
    boardGenerationModal: { ...state.boardGenerationModal, loading, error: null }
  })),
  setBoardGenerationResult: (board) => set((state) => ({
    boardGenerationModal: { ...state.boardGenerationModal, loading: false, board, error: null }
  })),
  setBoardGenerationError: (error) => set((state) => ({
    boardGenerationModal: { ...state.boardGenerationModal, loading: false, error }
  })),
  clearBoardGenerationResult: () => set((state) => ({
    boardGenerationModal: { ...state.boardGenerationModal, board: null }
  })),

  openToolProfilesModal: () => set({ toolProfilesModal: { open: true } }),
  closeToolProfilesModal: () => set({ toolProfilesModal: { open: false } }),

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
