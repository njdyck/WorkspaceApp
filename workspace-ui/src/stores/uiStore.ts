import { create } from 'zustand';

interface UIState {
  addModal: { open: boolean };
  sidePanel: { open: boolean; itemId: string | null };

  // Actions
  openAddModal: () => void;
  closeAddModal: () => void;
  openSidePanel: (itemId: string) => void;
  closeSidePanel: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  addModal: { open: false },
  sidePanel: { open: false, itemId: null },

  openAddModal: () => {
    set({ addModal: { open: true } });
  },

  closeAddModal: () => {
    set({ addModal: { open: false } });
  },

  openSidePanel: (itemId) => {
    set({ sidePanel: { open: true, itemId } });
  },

  closeSidePanel: () => {
    set({ sidePanel: { open: false, itemId: null } });
  },
}));
