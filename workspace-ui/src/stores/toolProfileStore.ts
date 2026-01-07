import { create } from 'zustand';

// ============================================
// Tool Profile Types
// ============================================

export interface ToolProfile {
  id: string;
  name: string;
  defaultUrl: string;
  userUrl?: string;
  icon: string;
  category: 'automation' | 'development' | 'design' | 'productivity' | 'database';
}

interface ToolProfileState {
  tools: ToolProfile[];

  // Actions
  getToolUrl: (toolId: string) => string | null;
  setToolUrl: (toolId: string, url: string) => void;
  resetToolUrl: (toolId: string) => void;
  getAllTools: () => ToolProfile[];
  getToolById: (toolId: string) => ToolProfile | undefined;
  addCustomTool: (tool: Omit<ToolProfile, 'userUrl'>) => void;
}

// ============================================
// Default Tools
// ============================================

const DEFAULT_TOOLS: ToolProfile[] = [
  // Automation
  { id: 'n8n', name: 'n8n', defaultUrl: 'https://app.n8n.cloud', icon: 'Workflow', category: 'automation' },
  { id: 'make', name: 'Make', defaultUrl: 'https://make.com', icon: 'Zap', category: 'automation' },
  { id: 'zapier', name: 'Zapier', defaultUrl: 'https://zapier.com', icon: 'Zap', category: 'automation' },

  // Development
  { id: 'lovable', name: 'Lovable', defaultUrl: 'https://lovable.dev', icon: 'Heart', category: 'development' },
  { id: 'github', name: 'GitHub', defaultUrl: 'https://github.com', icon: 'Github', category: 'development' },
  { id: 'vercel', name: 'Vercel', defaultUrl: 'https://vercel.com', icon: 'Triangle', category: 'development' },
  { id: 'netlify', name: 'Netlify', defaultUrl: 'https://netlify.com', icon: 'Globe', category: 'development' },
  { id: 'retool', name: 'Retool', defaultUrl: 'https://retool.com', icon: 'Layout', category: 'development' },

  // Database
  { id: 'supabase', name: 'Supabase', defaultUrl: 'https://supabase.com/dashboard', icon: 'Database', category: 'database' },
  { id: 'firebase', name: 'Firebase', defaultUrl: 'https://console.firebase.google.com', icon: 'Flame', category: 'database' },
  { id: 'airtable', name: 'Airtable', defaultUrl: 'https://airtable.com', icon: 'Table', category: 'database' },

  // Design
  { id: 'figma', name: 'Figma', defaultUrl: 'https://figma.com', icon: 'Figma', category: 'design' },
  { id: 'canva', name: 'Canva', defaultUrl: 'https://canva.com', icon: 'Palette', category: 'design' },

  // Productivity
  { id: 'notion', name: 'Notion', defaultUrl: 'https://notion.so', icon: 'FileText', category: 'productivity' },
  { id: 'linear', name: 'Linear', defaultUrl: 'https://linear.app', icon: 'CheckSquare', category: 'productivity' },
  { id: 'slack', name: 'Slack', defaultUrl: 'https://slack.com', icon: 'MessageSquare', category: 'productivity' },
  { id: 'discord', name: 'Discord', defaultUrl: 'https://discord.com', icon: 'MessageCircle', category: 'productivity' },
];

// ============================================
// LocalStorage
// ============================================

const STORAGE_KEY = 'workspace-tool-profiles';

function loadFromStorage(): Map<string, string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return new Map(Object.entries(parsed));
    }
  } catch (e) {
    console.warn('Failed to load tool profiles from storage:', e);
  }
  return new Map();
}

function saveToStorage(userUrls: Map<string, string>): void {
  try {
    const obj = Object.fromEntries(userUrls);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch (e) {
    console.warn('Failed to save tool profiles to storage:', e);
  }
}

// ============================================
// Store
// ============================================

export const useToolProfileStore = create<ToolProfileState>((set, get) => {
  // Load user URLs from storage on init
  const storedUserUrls = loadFromStorage();

  // Merge stored URLs with default tools
  const initialTools = DEFAULT_TOOLS.map(tool => ({
    ...tool,
    userUrl: storedUserUrls.get(tool.id),
  }));

  return {
    tools: initialTools,

    getToolUrl: (toolId: string) => {
      const tool = get().tools.find(t => t.id === toolId);
      if (!tool) return null;
      return tool.userUrl || tool.defaultUrl;
    },

    setToolUrl: (toolId: string, url: string) => {
      set((state) => {
        const updatedTools = state.tools.map(tool =>
          tool.id === toolId ? { ...tool, userUrl: url } : tool
        );

        // Save to storage
        const userUrls = new Map<string, string>();
        updatedTools.forEach(tool => {
          if (tool.userUrl) {
            userUrls.set(tool.id, tool.userUrl);
          }
        });
        saveToStorage(userUrls);

        return { tools: updatedTools };
      });
    },

    resetToolUrl: (toolId: string) => {
      set((state) => {
        const updatedTools = state.tools.map(tool =>
          tool.id === toolId ? { ...tool, userUrl: undefined } : tool
        );

        // Save to storage
        const userUrls = new Map<string, string>();
        updatedTools.forEach(tool => {
          if (tool.userUrl) {
            userUrls.set(tool.id, tool.userUrl);
          }
        });
        saveToStorage(userUrls);

        return { tools: updatedTools };
      });
    },

    getAllTools: () => get().tools,

    getToolById: (toolId: string) => get().tools.find(t => t.id === toolId),

    addCustomTool: (tool: Omit<ToolProfile, 'userUrl'>) => {
      set((state) => ({
        tools: [...state.tools, { ...tool, userUrl: undefined }],
      }));
    },
  };
});

// ============================================
// Helper: Get tool URL for AI service
// ============================================

export function resolveToolUrl(toolId: string): string | null {
  return useToolProfileStore.getState().getToolUrl(toolId);
}

// Export list of known tool IDs for GPT prompt
export function getKnownToolIds(): string[] {
  return useToolProfileStore.getState().tools.map(t => t.id);
}
