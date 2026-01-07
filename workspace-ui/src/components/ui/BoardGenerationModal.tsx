import React, { useState, useCallback } from 'react';
import {
  X,
  Sparkles,
  Loader2,
  AlertCircle,
  Layout,
  Globe,
  FileText,
  CheckSquare,
  ChevronRight,
} from 'lucide-react';
import { useUIStore, useCanvasStore } from '@/stores';
import { useToolProfileStore } from '@/stores/toolProfileStore';
import {
  generateBoardFromPrompt,
  GeneratedBoard,
  GeneratedContainer,
  GeneratedBoardItem,
  loadApiKey,
} from '@/services/ai';
import { generateId } from '@/utils';
import { GRID_SIZE } from '@/constants/canvas';

// ============================================
// Layout Constants - Workspace Style
// ============================================

// Container sizes based on screen dimensions
const WORKSPACE_WIDTH = 1400;
const WORKSPACE_HEIGHT = 900;
const CONTAINER_GAP = 60;
const ITEM_GAP = 24;
const PADDING = 40;

// Item sizes
const NOTE_WIDTH = 280;
const NOTE_HEIGHT = 100;
const TASK_WIDTH = 300;
const TASK_HEIGHT = 90;
const WEBVIEW_WIDTH = 700;
const WEBVIEW_HEIGHT = 500;

// ============================================
// Layout Types
// ============================================

interface ItemLayout {
  item: GeneratedBoardItem;
  x: number;
  y: number;
  width: number;
  height: number;
  resolvedUrl?: string;
}

interface ContainerLayout {
  container: GeneratedContainer;
  x: number;
  y: number;
  width: number;
  height: number;
  items: ItemLayout[];
}

// ============================================
// Layout Helpers
// ============================================

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function calculateBoardLayout(
  board: GeneratedBoard,
  viewportCenter: { x: number; y: number },
  getToolUrl: (toolId: string) => string | null
): { containers: ContainerLayout[] } {
  const containers: ContainerLayout[] = [];
  const numContainers = board.containers.length;

  // Calculate workspace layout based on container types
  // Typical layout: Plan (left), Work (center, largest), Test (right)
  const layoutConfig = getLayoutConfig(board.containers);

  // Total width of all containers
  const totalWidth = layoutConfig.reduce((sum, cfg) => sum + cfg.width, 0) +
                     (numContainers - 1) * CONTAINER_GAP;
  const totalHeight = Math.max(...layoutConfig.map(cfg => cfg.height));

  // Start position (centered on viewport)
  let currentX = viewportCenter.x - totalWidth / 2;
  const baseY = viewportCenter.y - totalHeight / 2;

  board.containers.forEach((container, idx) => {
    const config = layoutConfig[idx];
    const containerWidth = config.width;
    const containerHeight = config.height;

    const containerLayout: ContainerLayout = {
      container,
      x: snapToGrid(currentX),
      y: snapToGrid(baseY),
      width: containerWidth,
      height: containerHeight,
      items: [],
    };

    // Layout items inside container based on container type
    const itemLayouts = layoutItemsInContainer(
      container.items,
      containerLayout,
      container.type,
      getToolUrl
    );
    containerLayout.items = itemLayouts;

    containers.push(containerLayout);
    currentX += containerWidth + CONTAINER_GAP;
  });

  return { containers };
}

// Get layout configuration based on container types
function getLayoutConfig(containers: GeneratedContainer[]): Array<{ width: number; height: number }> {
  return containers.map(container => {
    const hasWebview = container.items.some(i => i.type === 'webview');
    const itemCount = container.items.length;

    if (container.type === 'work' || hasWebview) {
      // Work container is largest - workspace size
      return {
        width: WORKSPACE_WIDTH,
        height: WORKSPACE_HEIGHT
      };
    } else if (container.type === 'plan') {
      // Plan container - medium width for notes/tasks
      const rows = Math.ceil(itemCount / 2);
      return {
        width: Math.max(600, NOTE_WIDTH * 2 + ITEM_GAP + PADDING * 2),
        height: Math.max(500, rows * (NOTE_HEIGHT + ITEM_GAP) + PADDING * 2 + 60)
      };
    } else {
      // Test/other containers - similar to plan
      const rows = Math.ceil(itemCount / 2);
      return {
        width: Math.max(550, TASK_WIDTH * 2 + ITEM_GAP + PADDING * 2),
        height: Math.max(450, rows * (TASK_HEIGHT + ITEM_GAP) + PADDING * 2 + 60)
      };
    }
  });
}

// Layout items inside a container with workspace-style arrangement
function layoutItemsInContainer(
  items: GeneratedBoardItem[],
  container: ContainerLayout,
  containerType: string,
  getToolUrl: (toolId: string) => string | null
): ItemLayout[] {
  const layouts: ItemLayout[] = [];

  // Separate webviews from other items
  const webviews = items.filter(i => i.type === 'webview');
  const others = items.filter(i => i.type !== 'webview');

  const contentStartY = container.y + 60; // Space for container header
  const contentStartX = container.x + PADDING;
  const contentWidth = container.width - PADDING * 2;
  const contentHeight = container.height - 60 - PADDING;

  if (containerType === 'work' && webviews.length > 0) {
    // Work container: Webviews side by side or stacked, notes around them
    layoutWorkContainer(layouts, webviews, others, container, contentStartX, contentStartY, contentWidth, contentHeight, getToolUrl);
  } else {
    // Plan/Test containers: Grid layout for notes/tasks
    layoutGridContainer(layouts, items, contentStartX, contentStartY, contentWidth, getToolUrl);
  }

  return layouts;
}

// Layout for Work container with webviews
function layoutWorkContainer(
  layouts: ItemLayout[],
  webviews: GeneratedBoardItem[],
  others: GeneratedBoardItem[],
  container: ContainerLayout,
  startX: number,
  startY: number,
  contentWidth: number,
  contentHeight: number,
  getToolUrl: (toolId: string) => string | null
) {
  // Layout webviews
  if (webviews.length === 1) {
    // Single webview - large and centered
    const wvWidth = Math.min(WEBVIEW_WIDTH, contentWidth - ITEM_GAP);
    const wvHeight = Math.min(WEBVIEW_HEIGHT, contentHeight - 150);
    const wvX = startX + (contentWidth - wvWidth) / 2;

    layouts.push({
      item: webviews[0],
      x: snapToGrid(wvX),
      y: snapToGrid(startY),
      width: wvWidth,
      height: wvHeight,
      resolvedUrl: resolveUrl(webviews[0], getToolUrl),
    });

    // Layout other items below webview in a row
    let noteX = startX;
    const noteY = startY + wvHeight + ITEM_GAP;
    others.forEach(item => {
      const w = item.type === 'task' ? TASK_WIDTH : NOTE_WIDTH;
      const h = item.type === 'task' ? TASK_HEIGHT : NOTE_HEIGHT;

      if (noteX + w > container.x + container.width - PADDING) {
        noteX = startX;
      }

      layouts.push({
        item,
        x: snapToGrid(noteX),
        y: snapToGrid(noteY),
        width: w,
        height: h,
        resolvedUrl: resolveUrl(item, getToolUrl),
      });
      noteX += w + ITEM_GAP;
    });
  } else if (webviews.length >= 2) {
    // Multiple webviews - side by side
    const wvWidth = Math.min(600, (contentWidth - ITEM_GAP) / 2);
    const wvHeight = Math.min(450, contentHeight - 150);

    webviews.slice(0, 2).forEach((wv, idx) => {
      layouts.push({
        item: wv,
        x: snapToGrid(startX + idx * (wvWidth + ITEM_GAP)),
        y: snapToGrid(startY),
        width: wvWidth,
        height: wvHeight,
        resolvedUrl: resolveUrl(wv, getToolUrl),
      });
    });

    // Additional webviews and notes below
    let currentX = startX;
    let currentY = startY + wvHeight + ITEM_GAP;

    // Add remaining webviews (smaller)
    webviews.slice(2).forEach(wv => {
      const w = 500;
      const h = 350;
      layouts.push({
        item: wv,
        x: snapToGrid(currentX),
        y: snapToGrid(currentY),
        width: w,
        height: h,
        resolvedUrl: resolveUrl(wv, getToolUrl),
      });
      currentX += w + ITEM_GAP;
    });

    // Add notes/tasks in remaining space
    others.forEach(item => {
      const w = item.type === 'task' ? TASK_WIDTH : NOTE_WIDTH;
      const h = item.type === 'task' ? TASK_HEIGHT : NOTE_HEIGHT;

      if (currentX + w > container.x + container.width - PADDING) {
        currentX = startX;
        currentY += h + ITEM_GAP;
      }

      layouts.push({
        item,
        x: snapToGrid(currentX),
        y: snapToGrid(currentY),
        width: w,
        height: h,
        resolvedUrl: resolveUrl(item, getToolUrl),
      });
      currentX += w + ITEM_GAP;
    });
  } else {
    // No webviews - grid layout
    layoutGridContainer(layouts, others, startX, startY, contentWidth, getToolUrl);
  }
}

// Grid layout for Plan/Test containers
function layoutGridContainer(
  layouts: ItemLayout[],
  items: GeneratedBoardItem[],
  startX: number,
  startY: number,
  contentWidth: number,
  getToolUrl: (toolId: string) => string | null
) {
  // Calculate columns based on content width
  const itemWidth = NOTE_WIDTH;
  const cols = Math.max(1, Math.floor((contentWidth + ITEM_GAP) / (itemWidth + ITEM_GAP)));

  items.forEach((item, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);

    const w = item.type === 'task' ? TASK_WIDTH : NOTE_WIDTH;
    const h = item.type === 'task' ? TASK_HEIGHT : NOTE_HEIGHT;

    const x = startX + col * (itemWidth + ITEM_GAP);
    const y = startY + row * (NOTE_HEIGHT + ITEM_GAP);

    layouts.push({
      item,
      x: snapToGrid(x),
      y: snapToGrid(y),
      width: w,
      height: h,
      resolvedUrl: resolveUrl(item, getToolUrl),
    });
  });
}

// Helper to resolve URL for an item
function resolveUrl(
  item: GeneratedBoardItem,
  getToolUrl: (toolId: string) => string | null
): string | undefined {
  if (item.type === 'webview' && item.toolId) {
    return getToolUrl(item.toolId) || undefined;
  } else if (item.type === 'webview' && item.url) {
    return item.url;
  }
  return undefined;
}

// ============================================
// Component
// ============================================

export const BoardGenerationModal: React.FC = () => {
  const {
    boardGenerationModal,
    closeBoardGenerationModal,
    setBoardGenerationLoading,
    setBoardGenerationResult,
    setBoardGenerationError,
    clearBoardGenerationResult,
  } = useUIStore();
  const { addItem, viewport, setBoardName } = useCanvasStore();
  const { getToolUrl } = useToolProfileStore();
  const [prompt, setPrompt] = useState('');
  const [apiKey] = useState(() => loadApiKey() || '');

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    if (!apiKey) {
      setBoardGenerationError(
        'Bitte zuerst OpenAI API Key in den KI-Funktionen eingeben.'
      );
      return;
    }

    setBoardGenerationLoading(true);

    try {
      const result = await generateBoardFromPrompt(prompt, apiKey);
      setBoardGenerationResult(result.board);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unbekannter Fehler';
      setBoardGenerationError(message);
    }
  }, [
    prompt,
    apiKey,
    setBoardGenerationLoading,
    setBoardGenerationResult,
    setBoardGenerationError,
  ]);

  const handleCreateBoard = useCallback(() => {
    const board = boardGenerationModal.board;
    if (!board) return;

    // Calculate viewport center
    const centerX = -viewport.x + window.innerWidth / 2;
    const centerY = -viewport.y + window.innerHeight / 2;

    // Calculate layout
    const layout = calculateBoardLayout(
      board,
      { x: centerX, y: centerY },
      getToolUrl
    );

    // Create containers and items
    for (const containerLayout of layout.containers) {
      // Create container (group)
      addItem({
        id: generateId(),
        content: containerLayout.container.name,
        x: containerLayout.x,
        y: containerLayout.y,
        width: containerLayout.width,
        height: containerLayout.height,
        status: 'active',
        badge: 'group',
        color: containerLayout.container.color,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Create items inside container
      for (const itemLayout of containerLayout.items) {
        const badge =
          itemLayout.item.type === 'webview'
            ? 'webview'
            : itemLayout.item.type === 'task'
            ? 'task'
            : 'note';

        const color =
          itemLayout.item.priority === 'high'
            ? '#ef4444'
            : itemLayout.item.priority === 'medium'
            ? '#f59e0b'
            : undefined;

        addItem({
          id: generateId(),
          content: itemLayout.item.content,
          x: itemLayout.x,
          y: itemLayout.y,
          width: itemLayout.width,
          height: itemLayout.height,
          status: 'inbox',
          badge,
          color,
          url: itemLayout.resolvedUrl,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }

    // Update board name
    setBoardName(board.title);

    closeBoardGenerationModal();
    setPrompt('');
  }, [
    boardGenerationModal.board,
    viewport,
    addItem,
    setBoardName,
    closeBoardGenerationModal,
    getToolUrl,
  ]);

  const handleClose = useCallback(() => {
    closeBoardGenerationModal();
    setPrompt('');
  }, [closeBoardGenerationModal]);

  const handleRetry = useCallback(() => {
    setBoardGenerationError(null);
    clearBoardGenerationResult();
  }, [setBoardGenerationError, clearBoardGenerationResult]);

  if (!boardGenerationModal.open) return null;

  const board = boardGenerationModal.board;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Layout size={20} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Board Generator</h2>
              <p className="text-xs text-gray-500">
                Beschreibe dein Projekt, KI erstellt das Board
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Input Section - Show when no result yet */}
          {!board && !boardGenerationModal.loading && !boardGenerationModal.error && (
            <div className="space-y-4">
              <textarea
                autoFocus
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Beschreibe dein Projekt... z.B. 'Ich baue eine App mit n8n für Automatisierung und Lovable für das Frontend. Ich möchte Daten scrapen und in einer UI darstellen.'"
                className="w-full h-40 p-4 text-gray-800 border border-gray-200 rounded-xl resize-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.metaKey) {
                    handleGenerate();
                  }
                }}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">
                    ⌘
                  </kbd>{' '}
                  +{' '}
                  <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">
                    Enter
                  </kbd>{' '}
                  zum Generieren
                </p>
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || !apiKey}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Sparkles size={16} />
                  Board generieren
                </button>
              </div>
              {!apiKey && (
                <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg">
                  Bitte zuerst OpenAI API Key in den KI-Funktionen (Brain-Icon)
                  eingeben.
                </p>
              )}
            </div>
          )}

          {/* Loading State */}
          {boardGenerationModal.loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 size={48} className="text-purple-500 animate-spin mb-4" />
              <p className="text-gray-600 font-medium">
                Analysiere Projektbeschreibung...
              </p>
              <p className="text-gray-400 text-sm mt-1">
                GPT erstellt dein Board
              </p>
            </div>
          )}

          {/* Error State */}
          {boardGenerationModal.error && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertCircle size={32} className="text-red-500" />
              </div>
              <p className="text-gray-800 font-medium mb-2">
                Fehler bei der Generierung
              </p>
              <p className="text-gray-500 text-sm text-center max-w-md">
                {boardGenerationModal.error}
              </p>
              <button
                onClick={handleRetry}
                className="mt-4 px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              >
                Erneut versuchen
              </button>
            </div>
          )}

          {/* Preview Result */}
          {board && !boardGenerationModal.loading && (
            <div className="space-y-4">
              {/* Board Info */}
              <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100">
                <h3 className="font-semibold text-gray-800">{board.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{board.description}</p>
              </div>

              {/* Container Preview */}
              <div className="space-y-3">
                {board.containers.map((container, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border"
                    style={{
                      borderColor: container.color + '40',
                      backgroundColor: container.color + '10',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: container.color }}
                      />
                      <span className="font-medium text-gray-800">
                        {container.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({container.items.length} Items)
                      </span>
                    </div>
                    <div className="space-y-2">
                      {container.items.map((item, itemIdx) => {
                        const toolUrl = item.toolId
                          ? getToolUrl(item.toolId)
                          : null;
                        return (
                          <div
                            key={itemIdx}
                            className="flex items-start gap-2 text-sm"
                          >
                            {item.type === 'webview' && (
                              <Globe
                                size={14}
                                className="text-cyan-500 mt-0.5 shrink-0"
                              />
                            )}
                            {item.type === 'note' && (
                              <FileText
                                size={14}
                                className="text-gray-400 mt-0.5 shrink-0"
                              />
                            )}
                            {item.type === 'task' && (
                              <CheckSquare
                                size={14}
                                className="text-green-500 mt-0.5 shrink-0"
                              />
                            )}
                            <span className="text-gray-600 flex-1">
                              {item.content}
                            </span>
                            {item.toolId && toolUrl && (
                              <span className="text-xs text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded shrink-0">
                                {new URL(toolUrl).hostname}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {board && !boardGenerationModal.loading && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <button
              onClick={handleRetry}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Neu generieren
            </button>
            <button
              onClick={handleCreateBoard}
              className="px-5 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2"
            >
              Board erstellen
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
