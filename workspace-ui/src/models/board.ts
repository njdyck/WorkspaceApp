// Board Model - Für Speichern & Laden

import { CanvasItem } from './item';
import { Connection } from './connection';
import { Viewport } from './viewport';

export interface Board {
  id: string;
  name: string;
  items: CanvasItem[];
  connections: Connection[];
  viewport: Viewport;
  createdAt: number;
  updatedAt: number;
}

export interface BoardMetadata {
  id: string;
  name: string;
  itemCount: number;
  updatedAt: number;
}

