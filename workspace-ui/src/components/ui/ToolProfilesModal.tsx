import React, { useState, useCallback } from 'react';
import {
  X,
  Settings2,
  RotateCcw,
  Check,
  ExternalLink,
  Workflow,
  Heart,
  Database,
  Github,
  Triangle,
  Globe,
  Layout,
  FileText,
  CheckSquare,
  MessageSquare,
  MessageCircle,
  Zap,
  Table,
  Flame,
  Palette,
  Figma,
} from 'lucide-react';
import { useUIStore } from '@/stores';
import { useToolProfileStore, ToolProfile } from '@/stores/toolProfileStore';

// ============================================
// Icon Mapping
// ============================================

const ICON_MAP: Record<string, React.ElementType> = {
  Workflow,
  Heart,
  Database,
  Github,
  Triangle,
  Globe,
  Layout,
  FileText,
  CheckSquare,
  MessageSquare,
  MessageCircle,
  Zap,
  Table,
  Flame,
  Palette,
  Figma,
};

// ============================================
// Category Labels
// ============================================

const CATEGORY_LABELS: Record<string, string> = {
  automation: 'Automatisierung',
  development: 'Development',
  database: 'Datenbank',
  design: 'Design',
  productivity: 'Produktivität',
};

// ============================================
// Tool Item Component
// ============================================

interface ToolItemProps {
  tool: ToolProfile;
  onSave: (toolId: string, url: string) => void;
  onReset: (toolId: string) => void;
}

const ToolItem: React.FC<ToolItemProps> = ({ tool, onSave, onReset }) => {
  const [editing, setEditing] = useState(false);
  const [localUrl, setLocalUrl] = useState(tool.userUrl || tool.defaultUrl);
  const Icon = ICON_MAP[tool.icon] || Globe;
  const hasCustomUrl = !!tool.userUrl;
  const currentUrl = tool.userUrl || tool.defaultUrl;

  const handleSave = useCallback(() => {
    if (localUrl.trim() && localUrl !== tool.defaultUrl) {
      onSave(tool.id, localUrl.trim());
    } else if (localUrl === tool.defaultUrl) {
      onReset(tool.id);
    }
    setEditing(false);
  }, [localUrl, tool.id, tool.defaultUrl, onSave, onReset]);

  const handleReset = useCallback(() => {
    onReset(tool.id);
    setLocalUrl(tool.defaultUrl);
    setEditing(false);
  }, [tool.id, tool.defaultUrl, onReset]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        setLocalUrl(tool.userUrl || tool.defaultUrl);
        setEditing(false);
      }
    },
    [handleSave, tool.userUrl, tool.defaultUrl]
  );

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
          hasCustomUrl
            ? 'bg-purple-100 text-purple-600'
            : 'bg-gray-200 text-gray-500'
        }`}
      >
        <Icon size={20} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-800">{tool.name}</span>
          {hasCustomUrl && (
            <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded">
              Custom
            </span>
          )}
        </div>

        {editing ? (
          <div className="flex items-center gap-2 mt-1">
            <input
              type="text"
              value={localUrl}
              onChange={(e) => setLocalUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              autoFocus
              className="flex-1 text-sm px-2 py-1 border border-gray-300 rounded-lg focus:border-purple-400 focus:ring-1 focus:ring-purple-200 outline-none"
              placeholder="https://..."
            />
            <button
              onClick={handleSave}
              className="p-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
            >
              <Check size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-gray-500 hover:text-purple-600 truncate max-w-full text-left transition-colors"
          >
            {currentUrl}
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {hasCustomUrl && !editing && (
          <button
            onClick={handleReset}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors opacity-0 group-hover:opacity-100"
            title="Auf Standard zurücksetzen"
          >
            <RotateCcw size={14} />
          </button>
        )}
        <a
          href={currentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
          title="Öffnen"
        >
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
};

// ============================================
// Main Component
// ============================================

export const ToolProfilesModal: React.FC = () => {
  const { toolProfilesModal, closeToolProfilesModal } = useUIStore();
  const { tools, setToolUrl, resetToolUrl } = useToolProfileStore();

  // Group tools by category
  const groupedTools = tools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, ToolProfile[]>);

  if (!toolProfilesModal.open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
              <Settings2 size={20} className="text-gray-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Tool-Profile</h2>
              <p className="text-xs text-gray-500">
                Eigene URLs für bekannte Tools festlegen
              </p>
            </div>
          </div>
          <button
            onClick={closeToolProfilesModal}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Info */}
          <div className="p-3 bg-blue-50 rounded-xl text-sm text-blue-700">
            Klicke auf eine URL um sie anzupassen. Deine Einstellungen werden
            für die Board-Generierung verwendet.
          </div>

          {/* Tool Groups */}
          {Object.entries(groupedTools).map(([category, categoryTools]) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-gray-500 mb-2 px-1">
                {CATEGORY_LABELS[category] || category}
              </h3>
              <div className="space-y-2">
                {categoryTools.map((tool) => (
                  <ToolItem
                    key={tool.id}
                    tool={tool}
                    onSave={setToolUrl}
                    onReset={resetToolUrl}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={closeToolProfilesModal}
            className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 transition-colors"
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
};
