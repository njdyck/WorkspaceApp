export type ItemBadge = 'note' | 'link' | 'idea' | 'task' | 'group' | null;
export type ItemStatus = 'inbox' | 'active' | 'done';

export interface BaseItem {
  id: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  status: ItemStatus;
  badge: ItemBadge;
  color?: string; // Optional: Hex-Code oder Farbname
  createdAt: number;
  updatedAt: number;
}

export type CanvasItem = BaseItem;

export const DEFAULT_ITEM_WIDTH = 256;
export const DEFAULT_ITEM_HEIGHT = 80;
export const DEFAULT_GROUP_WIDTH = 400;
export const DEFAULT_GROUP_HEIGHT = 400;
