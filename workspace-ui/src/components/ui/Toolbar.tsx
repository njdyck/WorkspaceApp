import React, { useState } from 'react';
import { Save, FolderOpen, Plus, Download, Upload, Trash2, Search, Settings, HelpCircle, Grid3X3, Moon, Sun } from 'lucide-react';
import { useCanvasStore, useWebTabStore, useUIStore } from '@/stores';
import { listBoards, exportBoard, importBoard, loadBoard as loadBoardFromStorage, clearAllWorkspaceData } from '@/services/persistence';
import type { BoardMetadata } from '@/models';

interface ToolbarProps {
  boardName: string;
}

export const Toolbar: React.FC<ToolbarProps> = ({ boardName }) => {
  const { setBoardName, saveCurrentBoard, loadBoard, newBoard, boardId } = useCanvasStore();
  const { closeAllTabs } = useWebTabStore();
  const { openSearch, openHelpModal, gridSnapping, toggleGridSnapping, darkMode, toggleDarkMode } = useUIStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(boardName);
  const [showBoardList, setShowBoardList] = useState(false);
  const [boards, setBoards] = useState<BoardMetadata[]>([]);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  const handleClearWorkspace = async () => {
    if (confirm('Alle Daten löschen? Dies kann nicht rückgängig gemacht werden.')) {
      await closeAllTabs();
      clearAllWorkspaceData();
      window.location.reload();
    }
  };

  const handleNameClick = () => {
    setEditValue(boardName);
    setIsEditing(true);
  };

  const handleNameSubmit = () => {
    if (editValue.trim()) {
      setBoardName(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const handleOpenBoardList = () => {
    setBoards(listBoards());
    setShowBoardList(true);
  };

  const handleLoadBoard = (id: string) => {
    loadBoardFromStorage(id);
    loadBoard();
    setShowBoardList(false);
  };

  const handleExport = () => {
    if (!boardId) return;
    
    const json = exportBoard(boardId);
    if (!json) return;
    
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${boardName.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const text = await file.text();
      const board = importBoard(text);
      if (board) {
        loadBoard();
      }
    };
    input.click();
  };

  return (
    <div className="h-12 border-b border-gray-200 flex items-center px-4 bg-white justify-between select-none">
      {/* Left: Board Name & Actions */}
      <div className="flex items-center gap-3">
        {/* Board Name (editable) */}
        {isEditing ? (
          <input
            autoFocus
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={handleKeyDown}
            className="text-sm font-semibold text-gray-800 border-b-2 border-blue-500 outline-none bg-transparent px-1 py-0.5"
          />
        ) : (
          <button
            onClick={handleNameClick}
            className="text-sm font-semibold text-gray-800 hover:text-blue-600 transition-colors px-1 py-0.5 rounded hover:bg-gray-50"
          >
            {boardName}
          </button>
        )}

        {/* Board Actions */}
        <div className="flex items-center gap-1 border-l border-gray-200 pl-3">
          <button
            onClick={() => saveCurrentBoard()}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            title="Speichern"
          >
            <Save size={16} />
          </button>
          
          <button
            onClick={handleOpenBoardList}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            title="Board öffnen"
          >
            <FolderOpen size={16} />
          </button>
          
          <button
            onClick={() => newBoard()}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            title="Neues Board"
          >
            <Plus size={16} />
          </button>

          <div className="w-px h-4 bg-gray-200 mx-1" />

          <button
            onClick={handleExport}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            title="Exportieren"
          >
            <Download size={16} />
          </button>
          
          <button
            onClick={handleImport}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            title="Importieren"
          >
            <Upload size={16} />
          </button>

          <div className="w-px h-4 bg-gray-200 mx-1" />

          <button
            onClick={handleClearWorkspace}
            className="p-1.5 rounded hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors"
            title="Workspace löschen"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Right: Search, Grid, Theme, Help, Settings */}
      <div className="flex items-center gap-1 text-gray-500">
        {/* Search */}
        <button
          onClick={openSearch}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1.5"
          title="Suchen (⌘F)"
        >
          <Search size={16} />
          <span className="text-xs text-gray-400 hidden sm:inline">⌘F</span>
        </button>

        <div className="w-px h-4 bg-gray-200 mx-1" />

        {/* Grid Snapping */}
        <button
          onClick={toggleGridSnapping}
          className={`p-1.5 rounded transition-colors ${
            gridSnapping ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
          }`}
          title={`Grid-Snapping ${gridSnapping ? 'aus' : 'an'}schalten (⌘G)`}
        >
          <Grid3X3 size={16} />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          title="Theme wechseln (⌘⇧D)"
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Help */}
        <button
          onClick={openHelpModal}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          title="Hilfe (?)"
        >
          <HelpCircle size={16} />
        </button>

        <div className="w-px h-4 bg-gray-200 mx-1" />

        {/* Settings Menu */}
        <div className="relative">
          <button
            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            title="Einstellungen"
          >
            <Settings size={16} />
          </button>

          {showSettingsMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
              <button
                onClick={() => {
                  toggleGridSnapping();
                  setShowSettingsMenu(false);
                }}
                className="w-full px-3 py-2 flex items-center justify-between text-sm text-gray-700 hover:bg-gray-100"
              >
                <span>Grid-Snapping</span>
                <span className={`w-2 h-2 rounded-full ${gridSnapping ? 'bg-blue-500' : 'bg-gray-300'}`} />
              </button>
              <button
                onClick={() => {
                  toggleDarkMode();
                  setShowSettingsMenu(false);
                }}
                className="w-full px-3 py-2 flex items-center justify-between text-sm text-gray-700 hover:bg-gray-100"
              >
                <span>Dark Mode</span>
                <span className={`w-2 h-2 rounded-full ${darkMode ? 'bg-blue-500' : 'bg-gray-300'}`} />
              </button>
              <div className="h-px bg-gray-200 my-1" />
              <button
                onClick={() => {
                  openHelpModal();
                  setShowSettingsMenu(false);
                }}
                className="w-full px-3 py-2 flex items-center text-sm text-gray-700 hover:bg-gray-100"
              >
                Tastenkürzel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close settings */}
      {showSettingsMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowSettingsMenu(false)}
        />
      )}

      {/* Board List Modal */}
      {showBoardList && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl w-96 max-h-[70vh] overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-semibold text-gray-800">Boards</h2>
              <button
                onClick={() => setShowBoardList(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="p-2 max-h-80 overflow-y-auto">
              {boards.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">Keine Boards vorhanden</p>
              ) : (
                boards.map((board) => (
                  <button
                    key={board.id}
                    onClick={() => handleLoadBoard(board.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors ${
                      board.id === boardId ? 'bg-blue-50 border border-blue-100' : ''
                    }`}
                  >
                    <div className="font-medium text-gray-800 text-sm">{board.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {board.itemCount} Items · {new Date(board.updatedAt).toLocaleDateString('de-DE')}
                    </div>
                  </button>
                ))
              )}
            </div>
            
            <div className="p-3 border-t border-gray-100">
              <button
                onClick={() => {
                  newBoard();
                  setShowBoardList(false);
                }}
                className="w-full py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                + Neues Board erstellen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
