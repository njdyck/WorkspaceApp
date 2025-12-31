import React from 'react';
import { useCanvasStore, useUIStore } from '@/stores';
import { ItemStatus } from '@/models';

const CONTAINER_COLORS = [
  { label: 'Standard', value: 'transparent' },
  { label: 'Rot', value: '#fee2e2' },     // red-100
  { label: 'Orange', value: '#ffedd5' },  // orange-100
  { label: 'Gelb', value: '#fef9c3' },    // yellow-100
  { label: 'Grün', value: '#dcfce7' },    // green-100
  { label: 'Blau', value: '#dbeafe' },    // blue-100
  { label: 'Lila', value: '#f3e8ff' },    // purple-100
  { label: 'Grau', value: '#f3f4f6' },    // gray-100
];

export const SidePanel: React.FC = () => {
  const { sidePanel, closeSidePanel } = useUIStore();
  const { items, updateItem } = useCanvasStore();

  if (!sidePanel.open || !sidePanel.itemId) return null;

  const item = items.get(sidePanel.itemId);
  if (!item) return null;

  const isGroup = item.badge === 'group';

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateItem(item.id, { status: e.target.value as ItemStatus });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateItem(item.id, { content: e.target.value });
  };

  const handleColorChange = (color: string) => {
    updateItem(item.id, { color });
  };

  return (
    <div className="absolute right-0 top-0 bottom-0 w-96 bg-white shadow-xl border-l border-gray-100 p-6 flex flex-col z-20">
      <div className="flex justify-between items-start mb-6">
        <input
          type="text"
          value={item.content}
          onChange={handleContentChange}
          className="text-xl font-semibold text-gray-800 border-none outline-none focus:ring-0 bg-transparent w-full mr-4"
        />
        <button
          onClick={closeSidePanel}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          ×
        </button>
      </div>

      <div className="mb-6 flex flex-col gap-4">
        {/* Status Row (nur für normale Items relevant) */}
        {!isGroup && (
          <div className="flex items-center gap-4">
            <select
              value={item.status}
              onChange={handleStatusChange}
              className="bg-gray-50 border-none text-sm text-gray-600 font-medium py-1.5 px-3 rounded-md cursor-pointer outline-none focus:ring-1 focus:ring-gray-200"
            >
              <option value="inbox">Inbox</option>
              <option value="active">Active</option>
              <option value="done">Done</option>
            </select>

            {item.badge && (
              <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500">
                {item.badge}
              </span>
            )}
          </div>
        )}

        {/* Color Picker für Gruppen */}
        {isGroup && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Container Farbe
            </label>
            <div className="flex flex-wrap gap-2">
              {CONTAINER_COLORS.map((col) => (
                <button
                  key={col.value}
                  onClick={() => handleColorChange(col.value)}
                  className={`w-8 h-8 rounded-full border border-gray-200 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-300 ${
                    item.color === col.value || (!item.color && col.value === 'transparent') 
                      ? 'ring-2 ring-offset-1 ring-blue-500 scale-105' 
                      : ''
                  }`}
                  style={{ backgroundColor: col.value }}
                  title={col.label}
                >
                  {col.value === 'transparent' && (
                    <div className="w-full h-full rounded-full bg-white relative overflow-hidden">
                       <div className="absolute inset-0 border border-gray-300 rounded-full"></div>
                       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-6 bg-red-400 rotate-45"></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <textarea
        className="flex-1 w-full resize-none border-none outline-none text-gray-600 text-sm leading-relaxed placeholder-gray-300 bg-gray-50 rounded-md p-3"
        placeholder="Add details, notes, or context..."
      />
    </div>
  );
};
