import { useEffect } from 'react';
import { InfiniteCanvas } from '@/components/canvas';
import { Toolbar, BottomToolbar, AddModal, SidePanel } from '@/components/ui';
import { SearchPanel } from '@/components/ui/SearchPanel';
import { ContextMenu } from '@/components/ui/ContextMenu';
import { HelpModal } from '@/components/ui/HelpModal';
import { Minimap } from '@/components/ui/Minimap';
import { TaskGenerationModal } from '@/components/ui/TaskGenerationModal';
import { BoardGenerationModal } from '@/components/ui/BoardGenerationModal';
import { ToolProfilesModal } from '@/components/ui/ToolProfilesModal';
import { useCanvasStore, useUIStore } from '@/stores';
import { useKeyboard } from '@/hooks';
import './App.css';

function App() {
  useKeyboard();
  const { loadBoard, boardName } = useCanvasStore();
  const darkMode = useUIStore((s) => s.darkMode);

  // Board beim Start laden
  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  // Force light mode on startup
  useEffect(() => {
    useUIStore.getState().setDarkMode(false);
  }, []);

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden font-sans
      ${darkMode ? 'dark bg-gray-900 text-gray-100' : 'bg-white text-gray-900'}
    `}>
      <Toolbar boardName={boardName} />

      <div className="flex-1 flex relative overflow-hidden">
        <InfiniteCanvas />
        <SidePanel />
        <BottomToolbar />
        <Minimap />
      </div>

      {/* Modals & Overlays */}
      <AddModal />
      <SearchPanel />
      <ContextMenu />
      <HelpModal />
      <TaskGenerationModal />
      <BoardGenerationModal />
      <ToolProfilesModal />
    </div>
  );
}

export default App;
