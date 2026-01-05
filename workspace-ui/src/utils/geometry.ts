import { Point, Rect, SelectionRect, FocusZone } from '@/types';
import { CanvasItem } from '@/models';

export const isPointInRect = (point: Point, rect: Rect): boolean => {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
};

export const doRectsIntersect = (a: Rect, b: Rect): boolean => {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
};

export const selectionRectToRect = (sel: SelectionRect): Rect => {
  const x = Math.min(sel.startX, sel.endX);
  const y = Math.min(sel.startY, sel.endY);
  const width = Math.abs(sel.endX - sel.startX);
  const height = Math.abs(sel.endY - sel.startY);
  return { x, y, width, height };
};

export const getItemsInRect = (
  items: Map<string, CanvasItem>,
  selectionRect: SelectionRect
): string[] => {
  const rect = selectionRectToRect(selectionRect);
  const result: string[] = [];
  
  items.forEach((item, id) => {
    const itemRect: Rect = {
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
    };
    if (doRectsIntersect(rect, itemRect)) {
      result.push(id);
    }
  });
  
  return result;
};

export const isItemInViewport = (
  item: CanvasItem,
  viewportX: number,
  viewportY: number,
  viewportWidth: number,
  viewportHeight: number
): boolean => {
  const viewportRect: Rect = {
    x: -viewportX,
    y: -viewportY,
    width: viewportWidth,
    height: viewportHeight,
  };
  const itemRect: Rect = {
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
  };
  return doRectsIntersect(viewportRect, itemRect);
};

export const isItemInFocusZone = (
  item: CanvasItem,
  zone: FocusZone
): boolean => {
  const itemRect: Rect = {
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
  };
  const zoneRect: Rect = {
    x: zone.x,
    y: zone.y,
    width: zone.width,
    height: zone.height,
  };
  return doRectsIntersect(itemRect, zoneRect);
};





