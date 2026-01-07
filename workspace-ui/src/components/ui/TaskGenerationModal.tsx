import React, { useState, useCallback } from 'react';
import { X, Sparkles, CheckCircle2, AlertCircle, Loader2, Trash2, ArrowUp, ArrowRight, ArrowDown } from 'lucide-react';
import { useUIStore, useCanvasStore } from '@/stores';
import { GeneratedTask } from '@/services/ai';
import { generateId } from '@/utils';
import { DEFAULT_ITEM_WIDTH, DEFAULT_ITEM_HEIGHT } from '@/models';

export const TaskGenerationModal: React.FC = () => {
  const { taskGenerationModal, closeTaskGenerationModal } = useUIStore();
  const { addItem, viewport } = useCanvasStore();
  const [editedTasks, setEditedTasks] = useState<GeneratedTask[]>([]);

  // Sync edited tasks when modal opens with new tasks
  React.useEffect(() => {
    if (taskGenerationModal.tasks.length > 0) {
      setEditedTasks([...taskGenerationModal.tasks]);
    }
  }, [taskGenerationModal.tasks]);

  const handleClose = useCallback(() => {
    closeTaskGenerationModal();
    setEditedTasks([]);
  }, [closeTaskGenerationModal]);

  const handleRemoveTask = useCallback((index: number) => {
    setEditedTasks(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpdateTask = useCallback((index: number, updates: Partial<GeneratedTask>) => {
    setEditedTasks(prev => prev.map((task, i) =>
      i === index ? { ...task, ...updates } : task
    ));
  }, []);

  const handleCreateAllTasks = useCallback(() => {
    if (editedTasks.length === 0) return;

    // Position tasks in a grid near viewport center
    const centerX = -viewport.x + window.innerWidth / 2;
    const centerY = -viewport.y + window.innerHeight / 2;
    const cols = Math.ceil(Math.sqrt(editedTasks.length));
    const spacing = 30;

    editedTasks.forEach((task, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      const x = centerX - (cols * (DEFAULT_ITEM_WIDTH + spacing)) / 2 + col * (DEFAULT_ITEM_WIDTH + spacing);
      const y = centerY - (Math.ceil(editedTasks.length / cols) * (DEFAULT_ITEM_HEIGHT + spacing)) / 2 + row * (DEFAULT_ITEM_HEIGHT + spacing);

      addItem({
        id: generateId(),
        content: `${task.title}\n\n${task.description}`,
        x,
        y,
        width: DEFAULT_ITEM_WIDTH,
        height: DEFAULT_ITEM_HEIGHT,
        status: 'inbox',
        badge: 'task',
        color: task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#22c55e',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    handleClose();
  }, [editedTasks, viewport, addItem, handleClose]);

  if (!taskGenerationModal.open) return null;

  const priorityColors = {
    high: 'text-red-600 bg-red-50',
    medium: 'text-amber-600 bg-amber-50',
    low: 'text-green-600 bg-green-50',
  };

  const priorityIcons = {
    high: ArrowUp,
    medium: ArrowRight,
    low: ArrowDown,
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Sparkles size={20} className="text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">KI Task Generator</h2>
              <p className="text-xs text-gray-500">
                {taskGenerationModal.loading ? 'Analysiere...' : `${editedTasks.length} Tasks generiert`}
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
          {/* Loading State */}
          {taskGenerationModal.loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={40} className="text-purple-500 animate-spin mb-4" />
              <p className="text-gray-600 font-medium">Analysiere Canvas-Inhalte...</p>
              <p className="text-gray-400 text-sm mt-1">GPT-4 generiert Tasks</p>
            </div>
          )}

          {/* Error State */}
          {taskGenerationModal.error && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertCircle size={32} className="text-red-500" />
              </div>
              <p className="text-gray-800 font-medium mb-2">Fehler bei der Generierung</p>
              <p className="text-gray-500 text-sm text-center max-w-md">{taskGenerationModal.error}</p>
            </div>
          )}

          {/* Results */}
          {!taskGenerationModal.loading && !taskGenerationModal.error && editedTasks.length > 0 && (
            <div className="space-y-4">
              {/* Summary */}
              {taskGenerationModal.summary && (
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                  <p className="text-sm text-purple-800">{taskGenerationModal.summary}</p>
                </div>
              )}

              {/* Task List */}
              <div className="space-y-3">
                {editedTasks.map((task, index) => {
                  const PriorityIcon = priorityIcons[task.priority];
                  return (
                    <div
                      key={index}
                      className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded-lg ${priorityColors[task.priority]}`}>
                          <PriorityIcon size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={task.title}
                            onChange={(e) => handleUpdateTask(index, { title: e.target.value })}
                            className="font-medium text-gray-800 bg-transparent border-none outline-none w-full focus:ring-2 focus:ring-purple-200 rounded px-1 -mx-1"
                          />
                          <textarea
                            value={task.description}
                            onChange={(e) => handleUpdateTask(index, { description: e.target.value })}
                            className="text-sm text-gray-600 bg-transparent border-none outline-none w-full mt-1 resize-none focus:ring-2 focus:ring-purple-200 rounded px-1 -mx-1"
                            rows={2}
                          />
                          <div className="flex items-center gap-2 mt-2">
                            <select
                              value={task.priority}
                              onChange={(e) => handleUpdateTask(index, { priority: e.target.value as 'high' | 'medium' | 'low' })}
                              className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-purple-200 outline-none"
                            >
                              <option value="high">Hoch</option>
                              <option value="medium">Mittel</option>
                              <option value="low">Niedrig</option>
                            </select>
                            {task.sourceItemIds.length > 0 && (
                              <span className="text-xs text-gray-400">
                                Aus {task.sourceItemIds.length} Item(s)
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveTask(index)}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!taskGenerationModal.loading && !taskGenerationModal.error && editedTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <CheckCircle2 size={32} className="text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium">Keine Tasks generiert</p>
              <p className="text-gray-400 text-sm mt-1">Wähle Items auf dem Canvas aus und versuche es erneut</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {!taskGenerationModal.loading && editedTasks.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {editedTasks.length} Task{editedTasks.length !== 1 ? 's' : ''} bereit
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreateAllTasks}
                className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <CheckCircle2 size={16} />
                Alle erstellen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
