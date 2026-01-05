import React from 'react';
import { X, Keyboard } from 'lucide-react';
import { useUIStore } from '@/stores';
import { isMac } from '@/utils';

export const HelpModal: React.FC = () => {
  const helpModal = useUIStore((s) => s.helpModal);
  const closeHelpModal = useUIStore((s) => s.closeHelpModal);

  if (!helpModal.open) return null;

  const modifier = isMac() ? '⌘' : 'Ctrl';

  const shortcuts = [
    { category: 'Allgemein', items: [
      { keys: `${modifier} + N`, description: 'Neues Item erstellen' },
      { keys: `${modifier} + F`, description: 'Suche öffnen' },
      { keys: `${modifier} + Z`, description: 'Rückgängig (Undo)' },
      { keys: `${modifier} + Shift + Z`, description: 'Wiederholen (Redo)' },
      { keys: '?', description: 'Hilfe anzeigen' },
    ]},
    { category: 'Items', items: [
      { keys: `${modifier} + D`, description: 'Ausgewählte Items duplizieren' },
      { keys: 'Delete / ⌫', description: 'Ausgewählte Items löschen' },
      { keys: 'Escape', description: 'Auswahl aufheben' },
      { keys: 'Doppelklick', description: 'Item bearbeiten' },
    ]},
    { category: 'Canvas Navigation', items: [
      { keys: 'Scroll', description: 'Canvas verschieben' },
      { keys: `${modifier} + Scroll`, description: 'Zoom' },
      { keys: `Alt + Drag`, description: 'Canvas verschieben' },
      { keys: 'Drag auf leerem Bereich', description: 'Mehrfachauswahl' },
    ]},
    { category: 'Ansicht', items: [
      { keys: `${modifier} + G`, description: 'Grid-Snapping an/aus' },
      { keys: `${modifier} + Shift + D`, description: 'Dark Mode an/aus' },
      { keys: `${modifier} + .`, description: 'Focus Mode an/aus' },
    ]},
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeHelpModal}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[80vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Keyboard size={24} className="text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={closeHelpModal}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {shortcuts.map((section) => (
              <div key={section.category}>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  {section.category}
                </h3>
                <div className="space-y-2">
                  {section.items.map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-1.5"
                    >
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {shortcut.description}
                      </span>
                      <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-600">
                        {shortcut.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Drücke <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">?</kbd> um diese Hilfe jederzeit anzuzeigen
          </p>
        </div>
      </div>
    </div>
  );
};
