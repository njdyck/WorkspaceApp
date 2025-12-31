// Realtime Collaboration Service
// Abstrakte Schnittstelle für verschiedene Backends (WebSocket, Firebase, etc.)

import { CanvasItem, Connection } from '@/models';

// ============================================
// Types & Interfaces
// ============================================

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  lastSeen: number;
}

export interface RealtimeEvent {
  type: 'item_add' | 'item_update' | 'item_delete' | 
        'connection_add' | 'connection_delete' |
        'cursor_move' | 'user_join' | 'user_leave' |
        'viewport_change';
  payload: unknown;
  userId: string;
  timestamp: number;
}

export interface RealtimeConfig {
  serverUrl?: string;
  boardId: string;
  userId: string;
  userName: string;
}

// Callback-Typen
type EventCallback = (event: RealtimeEvent) => void;
type CollaboratorCallback = (collaborators: Collaborator[]) => void;
type ConnectionCallback = (connected: boolean) => void;

// ============================================
// Realtime Provider Interface
// ============================================

export interface RealtimeProvider {
  connect(): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;
  
  // Senden
  sendItemUpdate(item: Partial<CanvasItem> & { id: string }): void;
  sendItemAdd(item: CanvasItem): void;
  sendItemDelete(itemId: string): void;
  sendConnectionAdd(connection: Connection): void;
  sendConnectionDelete(connectionId: string): void;
  sendCursorMove(x: number, y: number): void;
  
  // Empfangen
  onEvent(callback: EventCallback): () => void;
  onCollaboratorsChange(callback: CollaboratorCallback): () => void;
  onConnectionChange(callback: ConnectionCallback): () => void;
}

// ============================================
// Local Mock Provider (für Entwicklung/Testing)
// ============================================

export class LocalMockProvider implements RealtimeProvider {
  private connected = false;
  private eventCallbacks: EventCallback[] = [];
  private collaboratorCallbacks: CollaboratorCallback[] = [];
  private connectionCallbacks: ConnectionCallback[] = [];
  private collaborators: Collaborator[] = [];
  private config: RealtimeConfig;

  constructor(config: RealtimeConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    // Simuliere Verbindungsaufbau
    await new Promise(resolve => setTimeout(resolve, 500));
    this.connected = true;
    
    // Eigenen User hinzufügen
    this.collaborators.push({
      id: this.config.userId,
      name: this.config.userName,
      color: this.generateColor(this.config.userId),
      lastSeen: Date.now(),
    });
    
    this.notifyConnectionChange(true);
    this.notifyCollaboratorsChange();
    
    console.log('[Realtime] Verbunden (Local Mock)');
  }

  disconnect(): void {
    this.connected = false;
    this.collaborators = [];
    this.notifyConnectionChange(false);
    console.log('[Realtime] Getrennt');
  }

  isConnected(): boolean {
    return this.connected;
  }

  sendItemUpdate(item: Partial<CanvasItem> & { id: string }): void {
    if (!this.connected) return;
    this.broadcastEvent({
      type: 'item_update',
      payload: item,
      userId: this.config.userId,
      timestamp: Date.now(),
    });
  }

  sendItemAdd(item: CanvasItem): void {
    if (!this.connected) return;
    this.broadcastEvent({
      type: 'item_add',
      payload: item,
      userId: this.config.userId,
      timestamp: Date.now(),
    });
  }

  sendItemDelete(itemId: string): void {
    if (!this.connected) return;
    this.broadcastEvent({
      type: 'item_delete',
      payload: { id: itemId },
      userId: this.config.userId,
      timestamp: Date.now(),
    });
  }

  sendConnectionAdd(connection: Connection): void {
    if (!this.connected) return;
    this.broadcastEvent({
      type: 'connection_add',
      payload: connection,
      userId: this.config.userId,
      timestamp: Date.now(),
    });
  }

  sendConnectionDelete(connectionId: string): void {
    if (!this.connected) return;
    this.broadcastEvent({
      type: 'connection_delete',
      payload: { id: connectionId },
      userId: this.config.userId,
      timestamp: Date.now(),
    });
  }

  sendCursorMove(x: number, y: number): void {
    if (!this.connected) return;
    
    // Update eigenen Cursor
    const selfIndex = this.collaborators.findIndex(c => c.id === this.config.userId);
    if (selfIndex !== -1) {
      this.collaborators[selfIndex].cursor = { x, y };
      this.collaborators[selfIndex].lastSeen = Date.now();
      this.notifyCollaboratorsChange();
    }
  }

  onEvent(callback: EventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      this.eventCallbacks = this.eventCallbacks.filter(cb => cb !== callback);
    };
  }

  onCollaboratorsChange(callback: CollaboratorCallback): () => void {
    this.collaboratorCallbacks.push(callback);
    return () => {
      this.collaboratorCallbacks = this.collaboratorCallbacks.filter(cb => cb !== callback);
    };
  }

  onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.push(callback);
    return () => {
      this.connectionCallbacks = this.connectionCallbacks.filter(cb => cb !== callback);
    };
  }

  // Private Helpers
  private broadcastEvent(event: RealtimeEvent): void {
    this.eventCallbacks.forEach(cb => cb(event));
  }

  private notifyCollaboratorsChange(): void {
    this.collaboratorCallbacks.forEach(cb => cb([...this.collaborators]));
  }

  private notifyConnectionChange(connected: boolean): void {
    this.connectionCallbacks.forEach(cb => cb(connected));
  }

  private generateColor(id: string): string {
    const colors = [
      '#ef4444', '#f97316', '#eab308', '#22c55e', 
      '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'
    ];
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }
}

// ============================================
// WebSocket Provider (für Produktions-Backend)
// ============================================

export class WebSocketProvider implements RealtimeProvider {
  private ws: WebSocket | null = null;
  private connected = false;
  private eventCallbacks: EventCallback[] = [];
  private collaboratorCallbacks: CollaboratorCallback[] = [];
  private connectionCallbacks: ConnectionCallback[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private config: RealtimeConfig;

  constructor(config: RealtimeConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (!this.config.serverUrl) {
      throw new Error('Server URL nicht konfiguriert');
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.serverUrl!);

        this.ws.onopen = () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          
          // Join-Nachricht senden
          this.ws?.send(JSON.stringify({
            type: 'join',
            boardId: this.config.boardId,
            userId: this.config.userId,
            userName: this.config.userName,
          }));
          
          this.notifyConnectionChange(true);
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'collaborators') {
              this.collaboratorCallbacks.forEach(cb => cb(data.payload));
            } else {
              this.eventCallbacks.forEach(cb => cb(data));
            }
          } catch (e) {
            console.error('[Realtime] Fehler beim Parsen:', e);
          }
        };

        this.ws.onclose = () => {
          this.connected = false;
          this.notifyConnectionChange(false);
          
          // Auto-Reconnect
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => this.connect(), 2000 * this.reconnectAttempts);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[Realtime] WebSocket Fehler:', error);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.maxReconnectAttempts = 0; // Verhindere Auto-Reconnect
    this.ws?.close();
    this.ws = null;
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  private send(type: string, payload: unknown): void {
    if (!this.connected || !this.ws) return;
    
    this.ws.send(JSON.stringify({
      type,
      payload,
      userId: this.config.userId,
      boardId: this.config.boardId,
      timestamp: Date.now(),
    }));
  }

  sendItemUpdate(item: Partial<CanvasItem> & { id: string }): void {
    this.send('item_update', item);
  }

  sendItemAdd(item: CanvasItem): void {
    this.send('item_add', item);
  }

  sendItemDelete(itemId: string): void {
    this.send('item_delete', { id: itemId });
  }

  sendConnectionAdd(connection: Connection): void {
    this.send('connection_add', connection);
  }

  sendConnectionDelete(connectionId: string): void {
    this.send('connection_delete', { id: connectionId });
  }

  sendCursorMove(x: number, y: number): void {
    this.send('cursor_move', { x, y });
  }

  onEvent(callback: EventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      this.eventCallbacks = this.eventCallbacks.filter(cb => cb !== callback);
    };
  }

  onCollaboratorsChange(callback: CollaboratorCallback): () => void {
    this.collaboratorCallbacks.push(callback);
    return () => {
      this.collaboratorCallbacks = this.collaboratorCallbacks.filter(cb => cb !== callback);
    };
  }

  onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.push(callback);
    return () => {
      this.connectionCallbacks = this.connectionCallbacks.filter(cb => cb !== callback);
    };
  }

  private notifyConnectionChange(connected: boolean): void {
    this.connectionCallbacks.forEach(cb => cb(connected));
  }
}

// ============================================
// Factory & Singleton
// ============================================

let currentProvider: RealtimeProvider | null = null;

export const createRealtimeProvider = (
  type: 'local' | 'websocket',
  config: RealtimeConfig
): RealtimeProvider => {
  if (currentProvider) {
    currentProvider.disconnect();
  }
  
  switch (type) {
    case 'websocket':
      currentProvider = new WebSocketProvider(config);
      break;
    case 'local':
    default:
      currentProvider = new LocalMockProvider(config);
  }
  
  return currentProvider;
};

export const getRealtimeProvider = (): RealtimeProvider | null => currentProvider;

