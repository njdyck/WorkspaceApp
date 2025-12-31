import { useEffect } from 'react';
import { InfiniteCanvas } from '@/components/canvas';
import { Toolbar, BottomToolbar, AddModal, SidePanel } from '@/components/ui';
import { useCanvasStore } from '@/stores';
import { useKeyboard } from '@/hooks';
import './App.css';

function App() {
  useKeyboard();
  const { loadBoard, boardName } = useCanvasStore();

  // Board beim Start laden
  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  return (
    <div className="h-screen w-screen flex flex-col bg-white overflow-hidden font-sans text-gray-900">
      <Toolbar boardName={boardName} />

      <div className="flex-1 flex relative overflow-hidden">
        <InfiniteCanvas />

        <SidePanel />
        <BottomToolbar />
      </div>

      <AddModal />
    </div>
  );
}

export default App;
