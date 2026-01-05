import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

// ============================================================================
// TYPES
// ============================================================================

export interface TabBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WebTab {
  id: string;
  itemId: string; // Referenz zum Canvas-Item
  url: string;
  isFullscreen: boolean;
  isFocused: boolean;
  isVisible: boolean;
  bounds: TabBounds;
}

interface WebTabState {
  tabs: Map<string, WebTab>;
  focusedTabId: string | null;

  // Actions
  createTab: (itemId: string, url: string, bounds: TabBounds) => Promise<string | null>;
  updateTabBounds: (tabId: string, bounds: TabBounds) => Promise<void>;
  focusTab: (tabId: string) => Promise<void>;
  unfocusAllTabs: () => Promise<void>;
  setTabFullscreen: (tabId: string, fullscreen: boolean) => Promise<void>;
  closeTab: (tabId: string) => Promise<void>;
  closeAllTabs: () => Promise<void>;
  setTabVisible: (tabId: string, visible: boolean) => Promise<void>;
  navigateTab: (tabId: string, url: string) => Promise<void>;
  getTabByItemId: (itemId: string) => WebTab | undefined;
  bringWebviewsToFront: () => Promise<void>;
  focusMainWindow: () => Promise<void>;

  // Internal
  _setTabFocused: (tabId: string, focused: boolean) => void;
  _removeTab: (tabId: string) => void;
  _setTabFullscreenState: (tabId: string, fullscreen: boolean) => void;
}

// ============================================================================
// STORE
// ============================================================================

// Lock Map um gleichzeitige Tab-Erstellung zu verhindern
const creatingTabs = new Set<string>();

export const useWebTabStore = create<WebTabState>((set, get) => ({
  tabs: new Map(),
  focusedTabId: null,

  createTab: async (itemId, url, bounds) => {
    const tabId = `webtab-${itemId}`;

    // Prüfen ob Tab bereits existiert
    const existingTab = get().tabs.get(tabId);

    if (existingTab) {
      // Tab existiert bereits - nur Bounds aktualisieren wenn nötig
      await get().updateTabBounds(tabId, bounds);
      return tabId;
    }

    // Prüfen ob bereits ein Tab erstellt wird (Lock)
    if (creatingTabs.has(tabId)) {
      // Warte kurz und prüfe nochmal ob Tab jetzt existiert
      await new Promise(resolve => setTimeout(resolve, 100));
      const retryTab = get().tabs.get(tabId);
      if (retryTab) {
        await get().updateTabBounds(tabId, bounds);
        return tabId;
      }
      // Falls immer noch nicht vorhanden, abbrechen (anderer Prozess erstellt ihn)
      return null;
    }

    // Lock setzen
    creatingTabs.add(tabId);

    try {
      await invoke('create_web_tab', {
        tabId,
        url,
        bounds: {
          x: Math.round(bounds.x),
          y: Math.round(bounds.y),
          width: Math.round(bounds.width),
          height: Math.round(bounds.height),
        },
      });

      const newTab: WebTab = {
        id: tabId,
        itemId,
        url,
        isFullscreen: false,
        isFocused: false,
        isVisible: true,
        bounds,
      };

      set((state) => {
        const newTabs = new Map(state.tabs);
        newTabs.set(tabId, newTab);
        return { tabs: newTabs };
      });

      // Lock entfernen
      creatingTabs.delete(tabId);
      
      return tabId;
    } catch (error) {
      console.error('Failed to create web tab:', error);
      // Lock entfernen bei Fehler
      creatingTabs.delete(tabId);
      return null;
    }
  },

  updateTabBounds: async (tabId, bounds) => {
    const tab = get().tabs.get(tabId);
    if (!tab || tab.isFullscreen) return;

    // Validate bounds
    const validBounds = {
      x: Math.round(Math.max(0, bounds.x)),
      y: Math.round(Math.max(0, bounds.y)),
      width: Math.round(Math.max(100, bounds.width)),
      height: Math.round(Math.max(100, bounds.height)),
    };

    // Throttled update to Rust
    try {
      await invoke('update_web_tab_bounds', {
        tabId,
        bounds: validBounds,
      });

      set((state) => {
        const newTabs = new Map(state.tabs);
        const existingTab = newTabs.get(tabId);
        if (existingTab) {
          newTabs.set(tabId, { ...existingTab, bounds });
        }
        return { tabs: newTabs };
      });
    } catch (error) {
      console.error('Failed to update tab bounds:', error);
    }
  },

  focusTab: async (tabId) => {
    try {
      await invoke('focus_web_tab', { tabId });
      set({ focusedTabId: tabId });
    } catch (error) {
      console.error('Failed to focus tab:', error);
    }
  },

  unfocusAllTabs: async () => {
    try {
      await invoke('unfocus_web_tabs');
      set({ focusedTabId: null });
    } catch (error) {
      console.error('Failed to unfocus tabs:', error);
    }
  },

  setTabFullscreen: async (tabId, fullscreen) => {
    try {
      await invoke('set_web_tab_fullscreen', { tabId, fullscreen });
    } catch (error) {
      console.error('Failed to set fullscreen:', error);
    }
  },

  closeTab: async (tabId) => {
    try {
      await invoke('close_web_tab', { tabId });
      get()._removeTab(tabId);
    } catch (error) {
      console.error('Failed to close tab:', error);
    }
  },

  setTabVisible: async (tabId, visible) => {
    try {
      await invoke('set_web_tab_visible', { tabId, visible });
      
      set((state) => {
        const newTabs = new Map(state.tabs);
        const tab = newTabs.get(tabId);
        if (tab) {
          newTabs.set(tabId, { ...tab, isVisible: visible });
        }
        return { tabs: newTabs };
      });
    } catch (error) {
      console.error('Failed to set visibility:', error);
    }
  },

  navigateTab: async (tabId, url) => {
    try {
      await invoke('navigate_web_tab', { tabId, url });
      
      set((state) => {
        const newTabs = new Map(state.tabs);
        const tab = newTabs.get(tabId);
        if (tab) {
          newTabs.set(tabId, { ...tab, url });
        }
        return { tabs: newTabs };
      });
    } catch (error) {
      console.error('Failed to navigate:', error);
    }
  },

  getTabByItemId: (itemId) => {
    const tabId = `webtab-${itemId}`;
    return get().tabs.get(tabId);
  },

  // Bring all webviews to front (above main window)
  bringWebviewsToFront: async () => {
    try {
      await invoke('bring_webviews_to_front');
    } catch (error) {
      console.error('Failed to bring webviews to front:', error);
    }
  },

  // Focus main window
  focusMainWindow: async () => {
    try {
      await invoke('focus_main_window');
    } catch (error) {
      console.error('Failed to focus main window:', error);
    }
  },

  // Alle Tabs schließen
  closeAllTabs: async () => {
    try {
      await invoke('close_all_web_tabs');
      set({ tabs: new Map(), focusedTabId: null });
    } catch (error) {
      console.error('Failed to close all tabs:', error);
    }
  },

  // Internal actions (called from event listeners)
  _setTabFocused: (tabId, focused) => {
    set((state) => {
      const newTabs = new Map(state.tabs);
      const tab = newTabs.get(tabId);
      if (tab) {
        newTabs.set(tabId, { ...tab, isFocused: focused });
      }
      return {
        tabs: newTabs,
        focusedTabId: focused ? tabId : (state.focusedTabId === tabId ? null : state.focusedTabId),
      };
    });
  },

  _removeTab: (tabId) => {
    set((state) => {
      const newTabs = new Map(state.tabs);
      newTabs.delete(tabId);
      return {
        tabs: newTabs,
        focusedTabId: state.focusedTabId === tabId ? null : state.focusedTabId,
      };
    });
  },

  _setTabFullscreenState: (tabId, fullscreen) => {
    set((state) => {
      const newTabs = new Map(state.tabs);
      const tab = newTabs.get(tabId);
      if (tab) {
        newTabs.set(tabId, { ...tab, isFullscreen: fullscreen });
      }
      return { tabs: newTabs };
    });
  },
}));

// ============================================================================
// EVENT LISTENERS (Setup on app init)
// ============================================================================

let listenersInitialized = false;

export async function initWebTabListeners() {
  if (listenersInitialized) return;
  listenersInitialized = true;

  const store = useWebTabStore.getState();

  // Schließe alle eventuell noch offenen Tabs vom letzten Session
  try {
    await invoke('close_all_web_tabs');
    console.log('Cleaned up old web tabs');
  } catch (e) {
    // Ignorieren wenn keine alten Tabs da sind
  }

  // Schließe alle verwaisten Webview-Fenster (die nicht im State sind)
  try {
    const closedCount = await invoke<number>('close_all_orphaned_webviews');
    if (closedCount > 0) {
      console.log(`Cleaned up ${closedCount} orphaned webview windows`);
    }
  } catch (e) {
    console.error('Failed to cleanup orphaned webviews:', e);
  }

  // Focus events
  await listen<{ tab_id: string; focused: boolean }>('web-tab-focus', (event) => {
    store._setTabFocused(event.payload.tab_id, event.payload.focused);
  });

  // Fullscreen events
  await listen<{ tab_id: string; fullscreen: boolean }>('web-tab-fullscreen', (event) => {
    store._setTabFullscreenState(event.payload.tab_id, event.payload.fullscreen);
  });

  // Close events
  await listen<string>('web-tab-closed', (event) => {
    store._removeTab(event.payload);
  });

  // ESC key handler für Fullscreen-Exit
  document.addEventListener('keydown', async (e) => {
    if (e.key === 'Escape') {
      const { tabs } = useWebTabStore.getState();
      for (const [tabId, tab] of tabs) {
        if (tab.isFullscreen) {
          await store.setTabFullscreen(tabId, false);
          break;
        }
      }
    }
  });

  console.log('Web tab listeners initialized');
}

