import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useCanvasStore } from '@/stores';
import { generateId } from '@/utils';

// ============================================================================
// FILE DROP HOOK - Native OS Drag-and-Drop Support
// ============================================================================

interface FileDropPayload {
  paths: string[];
  x: number;
  y: number;
}

/**
 * Hook zum Verarbeiten von nativen File-Drops vom Betriebssystem.
 *
 * Wenn Dateien auf das Canvas gedroppt werden:
 * 1. Konvertiert Screen-Koordinaten zu Canvas-Koordinaten
 * 2. Erstellt neue Items für jede Datei
 * 3. Positioniert die Items gestaffelt (nicht übereinander)
 */
export const useFileDrop = () => {
  useEffect(() => {
    // Listener für file-dropped Event vom Tauri Backend
    const unlisten = listen<FileDropPayload>('file-dropped', (event) => {
      const { paths, x, y } = event.payload;

      if (!paths || paths.length === 0) return;

      const canvasStore = useCanvasStore.getState();
      const { viewport, addItem } = canvasStore;

      // Screen to Canvas Koordinaten-Transformation
      // Formel: canvasCoord = (screenCoord - viewportOffset) / scale
      const canvasX = (x - viewport.x) / viewport.scale;
      const canvasY = (y - viewport.y) / viewport.scale;

      // Für jede gedroppte Datei ein neues Item erstellen
      paths.forEach((filePath, index) => {
        // Dateinamen aus Pfad extrahieren
        const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'File';

        // Dateiendung für Badge-Typ ermitteln
        const extension = fileName.split('.').pop()?.toLowerCase() || '';
        const badge = getFileBadge(extension);

        // Item mit Staffelung erstellen (nicht alle übereinander)
        const offsetX = index * 30; // Horizontal versetzt
        const offsetY = index * 30; // Vertikal versetzt

        addItem({
          id: generateId(),
          x: canvasX + offsetX,
          y: canvasY + offsetY,
          width: 220,
          height: 80,
          content: fileName,
          badge: badge,
          status: 'inbox',
          // Speichere den vollen Pfad für späteren Zugriff
          url: `file://${filePath}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      console.log(`Dropped ${paths.length} file(s) at canvas position (${canvasX.toFixed(0)}, ${canvasY.toFixed(0)})`);
    });

    // Cleanup: Listener entfernen wenn Component unmountet
    return () => {
      unlisten.then((unlistenFn) => unlistenFn());
    };
  }, []);
};

/**
 * Ermittelt den passenden Badge-Typ basierend auf der Dateiendung
 */
function getFileBadge(extension: string): 'link' | 'note' | 'task' | 'idea' {
  // Bilder
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico'].includes(extension)) {
    return 'idea'; // Bilder als "Idee"
  }

  // Dokumente
  if (['pdf', 'doc', 'docx', 'txt', 'md', 'rtf'].includes(extension)) {
    return 'note';
  }

  // Code/Config
  if (['js', 'ts', 'tsx', 'jsx', 'json', 'html', 'css', 'scss', 'py', 'rs', 'go'].includes(extension)) {
    return 'task'; // Code als "Task"
  }

  // Links/URLs
  if (['url', 'webloc', 'link'].includes(extension)) {
    return 'link';
  }

  // Default
  return 'note';
}
