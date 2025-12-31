// Connection Model - Explizite Beziehungen zwischen Items

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
  label?: string;
  color?: string;
  createdAt: number;
}

export type ConnectionType = 'default' | 'dependency' | 'reference' | 'related';

export const CONNECTION_COLORS: Record<ConnectionType, string> = {
  default: '#64748b',
  dependency: '#f59e0b',
  reference: '#3b82f6',
  related: '#8b5cf6',
};

