import React, { useState } from 'react';
import { useCanvasStore, useUIStore } from '@/stores';
import { generateId } from '@/utils';
import { DEFAULT_ITEM_WIDTH, DEFAULT_ITEM_HEIGHT, DEFAULT_GROUP_WIDTH, DEFAULT_GROUP_HEIGHT } from '@/models';

export const AddModal: React.FC = () => {
  const { addModal, closeAddModal } = useUIStore();
  const { addItem, viewport } = useCanvasStore();
  const [inputValue, setInputValue] = useState('');

  if (!addModal.open) return null;

  const detectBadge = (text: string) => {
    if (text.startsWith('http://') || text.startsWith('https://')) return 'link';
    if (text.toLowerCase().startsWith('idee:')) return 'idea';
    return null;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      closeAddModal();
      setInputValue('');
    }
    if (e.key === 'Enter' && inputValue.trim()) {
      createItem(inputValue.trim());
    }
  };

  const createItem = (text: string, type: 'item' | 'group' = 'item') => {
    // Position at viewport center with small random offset
    const centerX = -viewport.x + window.innerWidth / 2;
    const centerY = -viewport.y + window.innerHeight / 2;
    const randomOffset = () => (Math.random() - 0.5) * 100;

    const width = type === 'group' ? DEFAULT_GROUP_WIDTH : DEFAULT_ITEM_WIDTH;
    const height = type === 'group' ? DEFAULT_GROUP_HEIGHT : DEFAULT_ITEM_HEIGHT;
    
    // Adjust center for item size
    const x = centerX - width / 2 + randomOffset();
    const y = centerY - height / 2 + randomOffset();

    addItem({
      id: generateId(),
      content: text,
      x,
      y,
      width,
      height,
      status: 'inbox',
      badge: type === 'group' ? 'group' : detectBadge(text),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    setInputValue('');
    closeAddModal();
  };

  const examples = [
    { label: 'URL', text: 'https://...' },
    { label: 'Aufgabe', text: 'Meeting vorbereiten' },
    { label: 'Idee', text: 'Idee: Neues Projekt...' },
  ];

  return (
    <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl text-center space-y-6 relative z-10">
        <input
          autoFocus
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Schreib einfach los..."
          className="w-full text-4xl font-light text-center border-none bg-transparent outline-none placeholder-gray-300 text-gray-800"
          onKeyDown={handleKeyDown}
        />

        <div className="flex justify-center gap-4 text-sm text-gray-400">
          {examples.map((ex, i) => (
            <button
              key={i}
              onClick={() => setInputValue(ex.text)}
              className="hover:text-gray-600 transition-colors px-3 py-1 rounded-full hover:bg-gray-100"
            >
              <span className="font-medium text-gray-300 mr-2">{ex.label}</span>
              {ex.text}
            </button>
          ))}
          
          {/* New Group Button */}
          <button
            onClick={() => createItem(inputValue || 'Neue Gruppe', 'group')}
            className="hover:text-blue-600 transition-colors px-3 py-1 rounded-full hover:bg-blue-50 border border-transparent hover:border-blue-100"
          >
            <span className="font-medium text-blue-400 mr-2">Container</span>
            Erstellen
          </button>
        </div>
      </div>

      {/* Click outside to close */}
      <div
        className="absolute inset-0 cursor-default"
        onClick={() => {
          closeAddModal();
          setInputValue('');
        }}
        aria-label="Close"
      />
    </div>
  );
};
