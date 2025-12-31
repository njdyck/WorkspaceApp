import { create } from 'zustand';
import { Viewport, DEFAULT_VIEWPORT, CanvasItem, Connection } from '@/models';
import { SelectionRect } from '@/types';
import { generateId } from '@/utils';
import { saveBoard, loadCurrentBoard, createNewBoard } from '@/services/persistence';

interface CanvasState {
  // Board Info
  boardId: string | null;
  boardName: string;
  
  // Canvas State
  viewport: Viewport;
  items: Map<string, CanvasItem>;
  connections: Map<string, Connection>;
  selectedIds: Set<string>;
  isPanning: boolean;
  selectionRect: SelectionRect | null;
  
  // Connection Mode
  isConnecting: boolean;
  connectingFromId: string | null;

  // Actions
  pan: (deltaX: number, deltaY: number) => void;
  zoom: (scale: number, centerX: number, centerY: number) => void;
  setViewport: (viewport: Partial<Viewport>) => void;
  setItems: (items: CanvasItem[]) => void;
  addItem: (item: CanvasItem) => void;
  updateItem: (id: string, updates: Partial<CanvasItem>) => void;
  removeItem: (id: string) => void;
  select: (ids: string[]) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  moveSelected: (deltaX: number, deltaY: number) => void;
  setIsPanning: (isPanning: boolean) => void;
  setSelectionRect: (rect: SelectionRect | null) => void;
  
  // Connection Actions
  addConnection: (fromId: string, toId: string, label?: string) => void;
  removeConnection: (connectionId: string) => void;
  setConnections: (connections: Connection[]) => void;
  startConnecting: (fromId: string) => void;
  finishConnecting: (toId: string) => void;
  cancelConnecting: () => void;
  
  // Board Actions
  saveCurrentBoard: () => void;
  loadBoard: () => void;
  newBoard: (name?: string) => void;
  setBoardName: (name: string) => void;
}

// Auto-Save Debounce
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const autoSave = (saveFn: () => void) => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveFn, 1000);
};

export const useCanvasStore = create<CanvasState>((set, get) => ({
  boardId: null,
  boardName: 'Unbenanntes Board',
  viewport: DEFAULT_VIEWPORT,
  items: new Map(),
  connections: new Map(),
  selectedIds: new Set(),
  isPanning: false,
  selectionRect: null,
  isConnecting: false,
  connectingFromId: null,

  pan: (deltaX, deltaY) => {
    set((state) => ({
      viewport: {
        ...state.viewport,
        x: state.viewport.x + deltaX,
        y: state.viewport.y + deltaY,
      },
    }));
  },

  zoom: (scale, centerX, centerY) => {
    set((state) => {
      const oldScale = state.viewport.scale;
      // Erweiterter Zoom-Bereich (0.05x bis 10x)
      const newScale = Math.max(0.05, Math.min(10, scale));
      
      const newX = centerX - (centerX - state.viewport.x) * (newScale / oldScale);
      const newY = centerY - (centerY - state.viewport.y) * (newScale / oldScale);

      return {
        viewport: {
          ...state.viewport,
          scale: newScale,
          x: newX,
          y: newY,
        },
      };
    });
  },

  setViewport: (viewport) => {
    set((state) => ({
      viewport: { ...state.viewport, ...viewport },
    }));
  },

  setItems: (items) => {
    const map = new Map<string, CanvasItem>();
    items.forEach((item) => map.set(item.id, item));
    set({ items: map });
  },

  addItem: (item) => {
    set((state) => {
      const newItems = new Map(state.items);
      newItems.set(item.id, item);
      return { items: newItems };
    });
    autoSave(() => get().saveCurrentBoard());
  },

  updateItem: (id, updates) => {
    set((state) => {
      const item = state.items.get(id);
      if (!item) return state;
      const newItems = new Map(state.items);
      newItems.set(id, { ...item, ...updates, updatedAt: Date.now() });
      return { items: newItems };
    });
    autoSave(() => get().saveCurrentBoard());
  },

  removeItem: (id) => {
    set((state) => {
      const newItems = new Map(state.items);
      newItems.delete(id);
      const newSelectedIds = new Set(state.selectedIds);
      newSelectedIds.delete(id);
      
      // Auch zugehörige Connections entfernen
      const newConnections = new Map(state.connections);
      state.connections.forEach((conn, connId) => {
        if (conn.fromId === id || conn.toId === id) {
          newConnections.delete(connId);
        }
      });
      
      return { items: newItems, selectedIds: newSelectedIds, connections: newConnections };
    });
    autoSave(() => get().saveCurrentBoard());
  },

  select: (ids) => {
    set({ selectedIds: new Set(ids) });
  },

  toggleSelect: (id) => {
    set((state) => {
      const newSelectedIds = new Set(state.selectedIds);
      if (newSelectedIds.has(id)) {
        newSelectedIds.delete(id);
      } else {
        newSelectedIds.add(id);
      }
      return { selectedIds: newSelectedIds };
    });
  },

  clearSelection: () => {
    set({ selectedIds: new Set() });
  },

  moveSelected: (deltaX, deltaY) => {
    const { items, selectedIds } = get();
    const newItems = new Map(items);
    selectedIds.forEach((id) => {
      const item = newItems.get(id);
      if (item) {
        newItems.set(id, {
          ...item,
          x: item.x + deltaX,
          y: item.y + deltaY,
          updatedAt: Date.now(),
        });
      }
    });
    set({ items: newItems });
    autoSave(() => get().saveCurrentBoard());
  },

  setIsPanning: (isPanning) => {
    set({ isPanning });
  },

  setSelectionRect: (rect) => {
    set({ selectionRect: rect });
  },

  // Connection Actions
  addConnection: (fromId, toId, label) => {
    if (fromId === toId) return; // Keine Selbst-Verbindungen
    
    set((state) => {
      // Prüfen ob Connection bereits existiert
      const exists = Array.from(state.connections.values()).some(
        (c) => (c.fromId === fromId && c.toId === toId) || 
               (c.fromId === toId && c.toId === fromId)
      );
      
      if (exists) return state;
      
      const newConnections = new Map(state.connections);
      const connection: Connection = {
        id: generateId(),
        fromId,
        toId,
        label,
        createdAt: Date.now(),
      };
      newConnections.set(connection.id, connection);
      
      return { connections: newConnections };
    });
    autoSave(() => get().saveCurrentBoard());
  },

  removeConnection: (connectionId) => {
    set((state) => {
      const newConnections = new Map(state.connections);
      newConnections.delete(connectionId);
      return { connections: newConnections };
    });
    autoSave(() => get().saveCurrentBoard());
  },

  setConnections: (connections) => {
    const map = new Map<string, Connection>();
    connections.forEach((conn) => map.set(conn.id, conn));
    set({ connections: map });
  },

  startConnecting: (fromId) => {
    set({ isConnecting: true, connectingFromId: fromId });
  },

  finishConnecting: (toId) => {
    const { connectingFromId, addConnection } = get();
    if (connectingFromId && toId !== connectingFromId) {
      addConnection(connectingFromId, toId);
    }
    set({ isConnecting: false, connectingFromId: null });
  },

  cancelConnecting: () => {
    set({ isConnecting: false, connectingFromId: null });
  },

  // Board Actions
  saveCurrentBoard: () => {
    const { boardId, boardName, items, connections, viewport } = get();
    
    if (!boardId) {
      // Neues Board erstellen wenn keins existiert
      const board = createNewBoard(boardName);
      set({ boardId: board.id });
      saveBoard(
        board.id,
        boardName,
        Array.from(items.values()),
        Array.from(connections.values()),
        viewport
      );
    } else {
      saveBoard(
        boardId,
        boardName,
        Array.from(items.values()),
        Array.from(connections.values()),
        viewport
      );
    }
  },

  loadBoard: () => {
    const board = loadCurrentBoard();
    
    if (board) {
      const itemsMap = new Map<string, CanvasItem>();
      board.items.forEach((item) => itemsMap.set(item.id, item));
      
      const connectionsMap = new Map<string, Connection>();
      board.connections.forEach((conn) => connectionsMap.set(conn.id, conn));
      
      set({
        boardId: board.id,
        boardName: board.name,
        items: itemsMap,
        connections: connectionsMap,
        viewport: board.viewport,
        selectedIds: new Set(),
      });
    } else {
      // Neues Board erstellen wenn keins geladen werden kann
      const board = createNewBoard('Mein Workspace');
      set({
        boardId: board.id,
        boardName: board.name,
        items: new Map(),
        connections: new Map(),
        viewport: DEFAULT_VIEWPORT,
        selectedIds: new Set(),
      });
    }
  },

  newBoard: (name = 'Neues Board') => {
    const board = createNewBoard(name);
    set({
      boardId: board.id,
      boardName: board.name,
      items: new Map(),
      connections: new Map(),
      viewport: DEFAULT_VIEWPORT,
      selectedIds: new Set(),
    });
  },

  setBoardName: (name) => {
    set({ boardName: name });
    autoSave(() => get().saveCurrentBoard());
  },
}));
