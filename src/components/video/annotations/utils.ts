import type { Point, Rect, RotatedRect, CanvasScale, HandlePosition } from './types';

const ROTATION_HANDLE_OFFSET = 30;

export function canvasToScreen(point: Point, scale: CanvasScale): Point {
  return {
    x: point.x / scale.scaleX,
    y: point.y / scale.scaleY,
  };
}

export function screenToCanvas(point: Point, scale: CanvasScale): Point {
  return {
    x: point.x * scale.scaleX,
    y: point.y * scale.scaleY,
  };
}

export function isPointInRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function isPointInRotatedRect(point: Point, rect: RotatedRect): boolean {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;

  const dx = point.x - cx;
  const dy = point.y - cy;

  const cos = Math.cos(-rect.rotation);
  const sin = Math.sin(-rect.rotation);
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;

  return (
    localX >= -rect.width / 2 &&
    localX <= rect.width / 2 &&
    localY >= -rect.height / 2 &&
    localY <= rect.height / 2
  );
}

export function getRectCenter(rect: Rect): Point {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

export function getHandlePositions(rect: RotatedRect): Record<HandlePosition, Point> {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const hw = rect.width / 2;
  const hh = rect.height / 2;

  const cos = Math.cos(rect.rotation);
  const sin = Math.sin(rect.rotation);

  const rotate = (lx: number, ly: number): Point => ({
    x: cx + lx * cos - ly * sin,
    y: cy + lx * sin + ly * cos,
  });

  return {
    'top-left': rotate(-hw, -hh),
    'top-right': rotate(hw, -hh),
    'bottom-left': rotate(-hw, hh),
    'bottom-right': rotate(hw, hh),
    'rotation': rotate(0, -hh - ROTATION_HANDLE_OFFSET),
  };
}

export function isPointNearHandle(point: Point, handleCenter: Point, hitRadius: number): boolean {
  const dx = point.x - handleCenter.x;
  const dy = point.y - handleCenter.y;
  return dx * dx + dy * dy <= hitRadius * hitRadius;
}

export function getHandleAtPoint(
  point: Point,
  rect: RotatedRect,
  hitRadius: number,
): HandlePosition | null {
  const handles = getHandlePositions(rect);

  // Check rotation handle first (highest priority since it's small and specific)
  if (isPointNearHandle(point, handles['rotation'], hitRadius)) return 'rotation';

  const corners: HandlePosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
  for (const corner of corners) {
    if (isPointNearHandle(point, handles[corner], hitRadius)) return corner;
  }

  return null;
}

export function calculateHandleSize(displayWidth: number, dpr: number): { visual: number; hit: number } {
  const visual = Math.max(10, 24 / dpr);
  return { visual, hit: visual * 1.5 };
}

export function calculateActualFontSize(fontSize: number, canvasHeight: number): number {
  return fontSize * (canvasHeight / 1000);
}

export function wrapText(
  text: string,
  maxWidth: number,
  measureFn: (text: string) => number,
): readonly string[] {
  if (text === '') return [''];

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine === '') {
      currentLine = word;
    } else {
      const testLine = currentLine + ' ' + word;
      if (measureFn(testLine) <= maxWidth) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
  }

  if (currentLine !== '') {
    lines.push(currentLine);
  }

  return lines;
}

export function clampToCanvas(point: Point, canvasWidth: number, canvasHeight: number): Point {
  return {
    x: Math.max(0, Math.min(point.x, canvasWidth)),
    y: Math.max(0, Math.min(point.y, canvasHeight)),
  };
}

export const NEW_ANNOTATION_PREFIX = 'new-';

export function isNewAnnotation(id: string): boolean {
  return id.startsWith(NEW_ANNOTATION_PREFIX);
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds)) return '00:00:00.000';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${[h, m, s].map(v => v.toString().padStart(2, '0')).join(':')}.${ms.toString().padStart(3, '0')}`;
}
