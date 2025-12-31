// Persistence Service - LocalStorage basierte Speicherung

import { Board, BoardMetadata } from '@/models/board';
import { CanvasItem } from '@/models/item';
import { Connection } from '@/models/connection';
import { Viewport, DEFAULT_VIEWPORT } from '@/models/viewport';
import { generateId } from '@/utils';

const STORAGE_KEY = 'workspace_boards';
const CURRENT_BOARD_KEY = 'workspace_current_board';

// Hilfsfunktion: Alle Boards aus LocalStorage laden
const getAllBoards = (): Record<string, Board> => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error('Fehler beim Laden der Boards:', e);
    return {};
  }
};

// Hilfsfunktion: Alle Boards in LocalStorage speichern
const saveAllBoards = (boards: Record<string, Board>): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
  } catch (e) {
    console.error('Fehler beim Speichern der Boards:', e);
  }
};

// Board speichern
export const saveBoard = (
  boardId: string,
  name: string,
  items: CanvasItem[],
  connections: Connection[],
  viewport: Viewport
): Board => {
  const boards = getAllBoards();
  const existingBoard = boards[boardId];
  
  const board: Board = {
    id: boardId,
    name,
    items,
    connections,
    viewport,
    createdAt: existingBoard?.createdAt || Date.now(),
    updatedAt: Date.now(),
  };
  
  boards[boardId] = board;
  saveAllBoards(boards);
  localStorage.setItem(CURRENT_BOARD_KEY, boardId);
  
  return board;
};

// Neues Board erstellen
export const createNewBoard = (name: string = 'Neues Board'): Board => {
  const boardId = generateId();
  const board: Board = {
    id: boardId,
    name,
    items: [],
    connections: [],
    viewport: DEFAULT_VIEWPORT,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  const boards = getAllBoards();
  boards[boardId] = board;
  saveAllBoards(boards);
  localStorage.setItem(CURRENT_BOARD_KEY, boardId);
  
  return board;
};

// Board laden
export const loadBoard = (boardId: string): Board | null => {
  const boards = getAllBoards();
  const board = boards[boardId];
  
  if (board) {
    localStorage.setItem(CURRENT_BOARD_KEY, boardId);
  }
  
  return board || null;
};

// Aktuelles Board laden (das zuletzt geöffnete)
export const loadCurrentBoard = (): Board | null => {
  const currentBoardId = localStorage.getItem(CURRENT_BOARD_KEY);
  
  if (currentBoardId) {
    return loadBoard(currentBoardId);
  }
  
  // Falls kein aktuelles Board, erstes verfügbares laden
  const boards = getAllBoards();
  const boardIds = Object.keys(boards);
  
  if (boardIds.length > 0) {
    return loadBoard(boardIds[0]);
  }
  
  return null;
};

// Board löschen
export const deleteBoard = (boardId: string): void => {
  const boards = getAllBoards();
  delete boards[boardId];
  saveAllBoards(boards);
  
  // Falls das gelöschte Board das aktuelle war, aktuelles Board zurücksetzen
  const currentBoardId = localStorage.getItem(CURRENT_BOARD_KEY);
  if (currentBoardId === boardId) {
    const remainingIds = Object.keys(boards);
    if (remainingIds.length > 0) {
      localStorage.setItem(CURRENT_BOARD_KEY, remainingIds[0]);
    } else {
      localStorage.removeItem(CURRENT_BOARD_KEY);
    }
  }
};

// Alle Board-Metadaten abrufen (für Board-Liste)
export const listBoards = (): BoardMetadata[] => {
  const boards = getAllBoards();
  
  return Object.values(boards)
    .map((board) => ({
      id: board.id,
      name: board.name,
      itemCount: board.items.length,
      updatedAt: board.updatedAt,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
};

// Board umbenennen
export const renameBoard = (boardId: string, newName: string): void => {
  const boards = getAllBoards();
  
  if (boards[boardId]) {
    boards[boardId].name = newName;
    boards[boardId].updatedAt = Date.now();
    saveAllBoards(boards);
  }
};

// Board exportieren (als JSON)
export const exportBoard = (boardId: string): string | null => {
  const board = loadBoard(boardId);
  
  if (!board) return null;
  
  return JSON.stringify(board, null, 2);
};

// Board importieren (aus JSON)
export const importBoard = (jsonString: string): Board | null => {
  try {
    const imported = JSON.parse(jsonString) as Board;
    
    // Neue ID vergeben, um Konflikte zu vermeiden
    const newBoard: Board = {
      ...imported,
      id: generateId(),
      name: `${imported.name} (Import)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    const boards = getAllBoards();
    boards[newBoard.id] = newBoard;
    saveAllBoards(boards);
    
    return newBoard;
  } catch (e) {
    console.error('Fehler beim Importieren des Boards:', e);
    return null;
  }
};

// Auto-Save Debounce Utility
export const createAutoSave = (delayMs: number = 1000) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (saveFn: () => void) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      saveFn();
      timeoutId = null;
    }, delayMs);
  };
};

