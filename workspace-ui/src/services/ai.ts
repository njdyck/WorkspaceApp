// AI Service - Task Generation mit GPT-4
// Analysiert Canvas-Items und Webview-Inhalte, generiert strukturierte Tasks

import { CanvasItem } from '@/models/item';
import { invoke } from '@tauri-apps/api/core';

// ============================================
// Types
// ============================================

export interface GeneratedTask {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  sourceItemIds: string[];
}

export interface TaskGenerationResult {
  tasks: GeneratedTask[];
  summary: string;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface WebviewContent {
  tab_id: string;
  url: string;
  title: string | null;
  content: string | null;
}

// ============================================
// Webview Content Extraction
// ============================================

export async function extractWebviewContent(tabId: string): Promise<WebviewContent> {
  return invoke<WebviewContent>('extract_webview_content', { tabId });
}

export async function extractAllWebviewContents(): Promise<WebviewContent[]> {
  return invoke<WebviewContent[]>('extract_all_webview_contents');
}

// ============================================
// GPT-4 Task Generation
// ============================================

const SYSTEM_PROMPT = `Du bist ein Produktivitäts-Assistent, der Canvas-Inhalte analysiert und daraus strukturierte Tasks erstellt.

Analysiere die gegebenen Items (Notizen, Links, Ideen) und Webview-Inhalte und extrahiere daraus konkrete, actionable Tasks.

Regeln:
- Erstelle nur Tasks die sich aus den Inhalten ableiten lassen
- Jeder Task braucht einen klaren, kurzen Titel (max 60 Zeichen)
- Die Beschreibung erklärt was zu tun ist (1-2 Sätze)
- Priorität basiert auf Dringlichkeit/Wichtigkeit der Quelle
- Verweise auf die Quell-Item-IDs

Antworte NUR mit validem JSON in diesem Format:
{
  "tasks": [
    {
      "title": "Task-Titel",
      "description": "Was genau zu tun ist",
      "priority": "high|medium|low",
      "sourceItemIds": ["item-id-1", "item-id-2"]
    }
  ],
  "summary": "Kurze Zusammenfassung der analysierten Inhalte (1-2 Sätze)"
}`;

interface GPTMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GPTResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Formatiert Items und Webview-Contents für den Prompt
function formatContextForGPT(
  items: CanvasItem[],
  webviewContents: Map<string, WebviewContent>
): string {
  const parts: string[] = [];

  parts.push('=== CANVAS ITEMS ===\n');

  for (const item of items) {
    const webview = webviewContents.get(item.id);

    parts.push(`[Item ID: ${item.id}]`);
    parts.push(`Typ: ${item.badge || 'note'}`);
    parts.push(`Inhalt: ${item.content}`);

    if (item.url) {
      parts.push(`URL: ${item.url}`);
    }

    if (webview) {
      parts.push(`Webview-Titel: ${webview.title || 'Unbekannt'}`);
      if (webview.content) {
        // Content auf 2000 Zeichen pro Webview limitieren
        const truncated = webview.content.substring(0, 2000);
        parts.push(`Webview-Content: ${truncated}${webview.content.length > 2000 ? '...' : ''}`);
      }
    }

    parts.push('---\n');
  }

  return parts.join('\n');
}

// Haupt-Funktion: Generiert Tasks aus Items
export async function generateTasksFromItems(
  items: CanvasItem[],
  webviewContents: Map<string, WebviewContent>,
  apiKey: string
): Promise<TaskGenerationResult> {
  if (items.length === 0) {
    return {
      tasks: [],
      summary: 'Keine Items zum Analysieren vorhanden.',
    };
  }

  const context = formatContextForGPT(items, webviewContents);

  const messages: GPTMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Analysiere diese Inhalte und erstelle Tasks:\n\n${context}` },
  ];

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Günstiger und schnell genug für Task-Extraktion
        messages,
        temperature: 0.3, // Niedrig für konsistente Ergebnisse
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `API Error: ${response.status}`);
    }

    const data: GPTResponse = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Keine Antwort von GPT erhalten');
    }

    // JSON parsen
    const parsed = JSON.parse(content);

    // Validieren
    if (!Array.isArray(parsed.tasks)) {
      throw new Error('Ungültiges Response-Format: tasks fehlt');
    }

    // Tasks validieren und bereinigen
    const validTasks: GeneratedTask[] = parsed.tasks
      .filter((task: unknown): task is GeneratedTask => {
        if (typeof task !== 'object' || task === null) return false;
        const t = task as Record<string, unknown>;
        return (
          typeof t.title === 'string' &&
          typeof t.description === 'string' &&
          ['high', 'medium', 'low'].includes(t.priority as string) &&
          Array.isArray(t.sourceItemIds)
        );
      })
      .map((task: GeneratedTask) => ({
        title: task.title.substring(0, 100),
        description: task.description.substring(0, 500),
        priority: task.priority,
        sourceItemIds: task.sourceItemIds.filter((id: string) =>
          items.some(item => item.id === id)
        ),
      }));

    return {
      tasks: validTasks,
      summary: parsed.summary || 'Tasks wurden generiert.',
      tokenUsage: data.usage ? {
        prompt: data.usage.prompt_tokens,
        completion: data.usage.completion_tokens,
        total: data.usage.total_tokens,
      } : undefined,
    };
  } catch (error) {
    console.error('Task-Generierung fehlgeschlagen:', error);
    throw error;
  }
}

// ============================================
// Hilfsfunktionen
// ============================================

// Validiert OpenAI API Key Format
export function isValidApiKey(key: string): boolean {
  return key.startsWith('sk-') && key.length > 20;
}

// Speichert API Key in localStorage
export function saveApiKey(key: string): void {
  localStorage.setItem('openai_api_key', key);
}

// Lädt API Key aus localStorage
export function loadApiKey(): string | null {
  return localStorage.getItem('openai_api_key');
}

// Löscht API Key aus localStorage
export function clearApiKey(): void {
  localStorage.removeItem('openai_api_key');
}

// ============================================
// Board Generation Types
// ============================================

export interface GeneratedBoardItem {
  type: 'note' | 'task' | 'webview';
  content: string;
  url?: string;
  toolId?: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface GeneratedContainer {
  name: string;
  type: 'plan' | 'work' | 'test' | 'custom';
  color: string;
  items: GeneratedBoardItem[];
}

export interface GeneratedBoard {
  title: string;
  description: string;
  containers: GeneratedContainer[];
}

export interface BoardGenerationResult {
  board: GeneratedBoard;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

// ============================================
// Board Generation
// ============================================

const KNOWN_TOOLS = `
Bekannte Tools (verwende diese IDs für Webviews):
- n8n: Workflow-Automatisierung
- lovable: AI App Builder
- supabase: Backend/Datenbank
- github: Code Repository
- vercel: Deployment
- netlify: Deployment
- figma: Design
- notion: Dokumentation
- linear: Project Management
- retool: Internal Tools
- make: Automatisierung (Integromat)
- zapier: Automatisierung
- airtable: Datenbank/Spreadsheet
- firebase: Backend/Datenbank
- slack: Kommunikation
- discord: Kommunikation
`;

const BOARD_GENERATION_PROMPT = `Du bist ein Produktivitäts-Assistent, der aus Projektbeschreibungen strukturierte Canvas-Boards erstellt.

${KNOWN_TOOLS}

Analysiere die Beschreibung und erstelle ein Board mit folgender Struktur:

1. **Plan-Container**: Enthält Planungsschritte, Problemanalyse, Architektur-Entscheidungen
2. **Work-Container**: Enthält Webviews zu erwähnten Tools, Links zu Dokumentation, aktive Arbeitsitems
3. **Test-Container**: Enthält Teststrategien, Validierungsschritte, QA-Checklisten

Regeln:
- Erkenne erwähnte Tools und erstelle Webviews mit den Tool-IDs (NICHT URLs!)
- Erstelle sinnvolle Notizen und Tasks basierend auf dem Projektziel
- Verwende passende Farben: Plan=#8b5cf6 (lila), Work=#3b82f6 (blau), Test=#22c55e (grün)
- Jeder Container sollte 3-6 relevante Items haben
- Bei unbekannten Tools erstelle eine Notiz mit Recherche-Hinweis

Antworte NUR mit validem JSON:
{
  "title": "Board-Titel (kurz, beschreibend)",
  "description": "Kurze Zusammenfassung des Projekts (1-2 Sätze)",
  "containers": [
    {
      "name": "Plan",
      "type": "plan",
      "color": "#8b5cf6",
      "items": [
        { "type": "note", "content": "Beschreibung..." },
        { "type": "task", "content": "Aufgabe...", "priority": "high" }
      ]
    },
    {
      "name": "Work",
      "type": "work",
      "color": "#3b82f6",
      "items": [
        { "type": "webview", "content": "n8n Workflow Editor", "toolId": "n8n" },
        { "type": "note", "content": "API Dokumentation prüfen" }
      ]
    },
    {
      "name": "Test",
      "type": "test",
      "color": "#22c55e",
      "items": [
        { "type": "task", "content": "Testfall...", "priority": "medium" }
      ]
    }
  ]
}`;

export async function generateBoardFromPrompt(
  prompt: string,
  apiKey: string
): Promise<BoardGenerationResult> {
  if (!prompt.trim()) {
    throw new Error('Bitte beschreibe dein Projekt.');
  }

  const messages: GPTMessage[] = [
    { role: 'system', content: BOARD_GENERATION_PROMPT },
    { role: 'user', content: `Erstelle ein Canvas-Board für folgendes Projekt:\n\n${prompt}` },
  ];

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 3000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `API Error: ${response.status}`);
    }

    const data: GPTResponse = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Keine Antwort von GPT erhalten');
    }

    const parsed = JSON.parse(content);

    // Validierung
    if (!parsed.title || !Array.isArray(parsed.containers)) {
      throw new Error('Ungültiges Response-Format');
    }

    // Sanitize und validiere Board-Daten
    const validBoard: GeneratedBoard = {
      title: String(parsed.title).substring(0, 100),
      description: String(parsed.description || '').substring(0, 500),
      containers: parsed.containers
        .filter((c: unknown): c is GeneratedContainer => {
          if (typeof c !== 'object' || c === null) return false;
          const container = c as Record<string, unknown>;
          return typeof container.name === 'string' && Array.isArray(container.items);
        })
        .map((container: GeneratedContainer) => ({
          name: container.name.substring(0, 50),
          type: ['plan', 'work', 'test', 'custom'].includes(container.type)
            ? container.type
            : 'custom',
          color: container.color || '#6b7280',
          items: container.items
            .filter((item: unknown): item is GeneratedBoardItem => {
              if (typeof item !== 'object' || item === null) return false;
              const i = item as Record<string, unknown>;
              return typeof i.content === 'string' &&
                ['note', 'task', 'webview'].includes(i.type as string);
            })
            .map((item: GeneratedBoardItem) => ({
              type: item.type,
              content: item.content.substring(0, 500),
              url: item.url,
              toolId: item.toolId,
              priority: item.priority,
            })),
        })),
    };

    return {
      board: validBoard,
      tokenUsage: data.usage ? {
        prompt: data.usage.prompt_tokens,
        completion: data.usage.completion_tokens,
        total: data.usage.total_tokens,
      } : undefined,
    };
  } catch (error) {
    console.error('Board-Generierung fehlgeschlagen:', error);
    throw error;
  }
}
