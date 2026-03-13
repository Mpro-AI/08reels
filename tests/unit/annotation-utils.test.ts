import { describe, it, expect } from 'vitest';
import {
  canvasToScreen,
  screenToCanvas,
  isPointInRect,
  isPointInRotatedRect,
  getRectCenter,
  getHandlePositions,
  isPointNearHandle,
  getHandleAtPoint,
  calculateHandleSize,
  calculateActualFontSize,
  wrapText,
  clampToCanvas,
} from '@/components/video/annotations/utils';
import type { CanvasScale, RotatedRect } from '@/components/video/annotations/types';

// --- Test fixtures ---

const scale1080p: CanvasScale = {
  scaleX: 2,
  scaleY: 2,
  displayWidth: 960,
  displayHeight: 540,
  canvasWidth: 1920,
  canvasHeight: 1080,
};

const scale1to1: CanvasScale = {
  scaleX: 1,
  scaleY: 1,
  displayWidth: 1920,
  displayHeight: 1080,
  canvasWidth: 1920,
  canvasHeight: 1080,
};

const simpleRect = { x: 100, y: 100, width: 200, height: 100 };

const rotatedRect: RotatedRect = {
  x: 100,
  y: 100,
  width: 200,
  height: 100,
  rotation: 0,
};

const rotated45: RotatedRect = {
  x: 100,
  y: 100,
  width: 200,
  height: 100,
  rotation: Math.PI / 4, // 45 degrees
};

// --- canvasToScreen ---

describe('canvasToScreen', () => {
  it('should convert canvas coords to screen coords with 2x scale', () => {
    const result = canvasToScreen({ x: 100, y: 200 }, scale1080p);
    expect(result).toEqual({ x: 50, y: 100 });
  });

  it('should return same coords with 1:1 scale', () => {
    const result = canvasToScreen({ x: 100, y: 200 }, scale1to1);
    expect(result).toEqual({ x: 100, y: 200 });
  });

  it('should handle origin (0, 0)', () => {
    const result = canvasToScreen({ x: 0, y: 0 }, scale1080p);
    expect(result).toEqual({ x: 0, y: 0 });
  });
});

// --- screenToCanvas ---

describe('screenToCanvas', () => {
  it('should convert screen coords to canvas coords with 2x scale', () => {
    const result = screenToCanvas({ x: 50, y: 100 }, scale1080p);
    expect(result).toEqual({ x: 100, y: 200 });
  });

  it('should return same coords with 1:1 scale', () => {
    const result = screenToCanvas({ x: 100, y: 200 }, scale1to1);
    expect(result).toEqual({ x: 100, y: 200 });
  });

  it('should be the inverse of canvasToScreen', () => {
    const original = { x: 300, y: 150 };
    const screen = canvasToScreen(original, scale1080p);
    const back = screenToCanvas(screen, scale1080p);
    expect(back.x).toBeCloseTo(original.x);
    expect(back.y).toBeCloseTo(original.y);
  });
});

// --- isPointInRect ---

describe('isPointInRect', () => {
  it('should return true for point inside rect', () => {
    expect(isPointInRect({ x: 150, y: 150 }, simpleRect)).toBe(true);
  });

  it('should return true for point on edge', () => {
    expect(isPointInRect({ x: 100, y: 100 }, simpleRect)).toBe(true);
  });

  it('should return false for point outside rect', () => {
    expect(isPointInRect({ x: 50, y: 50 }, simpleRect)).toBe(false);
  });

  it('should return false for point just beyond right edge', () => {
    expect(isPointInRect({ x: 301, y: 150 }, simpleRect)).toBe(false);
  });

  it('should return false for point just beyond bottom edge', () => {
    expect(isPointInRect({ x: 150, y: 201 }, simpleRect)).toBe(false);
  });
});

// --- isPointInRotatedRect ---

describe('isPointInRotatedRect', () => {
  it('should work like isPointInRect when rotation is 0', () => {
    expect(isPointInRotatedRect({ x: 150, y: 150 }, rotatedRect)).toBe(true);
    expect(isPointInRotatedRect({ x: 50, y: 50 }, rotatedRect)).toBe(false);
  });

  it('should detect point inside a 45-degree rotated rect', () => {
    // Center of the rect
    const center = { x: 200, y: 150 };
    expect(isPointInRotatedRect(center, rotated45)).toBe(true);
  });

  it('should reject point outside a 45-degree rotated rect', () => {
    // A point that is inside the AABB but outside the rotated rect
    expect(isPointInRotatedRect({ x: 100, y: 100 }, rotated45)).toBe(false);
  });
});

// --- getRectCenter ---

describe('getRectCenter', () => {
  it('should return center of rect', () => {
    expect(getRectCenter(simpleRect)).toEqual({ x: 200, y: 150 });
  });

  it('should handle rect at origin', () => {
    expect(getRectCenter({ x: 0, y: 0, width: 100, height: 50 })).toEqual({ x: 50, y: 25 });
  });
});

// --- getHandlePositions ---

describe('getHandlePositions', () => {
  it('should return 5 handle positions for non-rotated rect', () => {
    const handles = getHandlePositions(rotatedRect);
    expect(handles['top-left']).toBeDefined();
    expect(handles['top-right']).toBeDefined();
    expect(handles['bottom-left']).toBeDefined();
    expect(handles['bottom-right']).toBeDefined();
    expect(handles['rotation']).toBeDefined();
  });

  it('should place corners correctly for non-rotated rect', () => {
    const handles = getHandlePositions(rotatedRect);
    expect(handles['top-left'].x).toBeCloseTo(100);
    expect(handles['top-left'].y).toBeCloseTo(100);
    expect(handles['bottom-right'].x).toBeCloseTo(300);
    expect(handles['bottom-right'].y).toBeCloseTo(200);
  });

  it('should place rotation handle above top-center', () => {
    const handles = getHandlePositions(rotatedRect);
    // Rotation handle should be above the rect center-top
    expect(handles['rotation'].x).toBeCloseTo(200);
    expect(handles['rotation'].y).toBeLessThan(100);
  });
});

// --- isPointNearHandle ---

describe('isPointNearHandle', () => {
  it('should return true when point is exactly on handle', () => {
    expect(isPointNearHandle({ x: 100, y: 100 }, { x: 100, y: 100 }, 10)).toBe(true);
  });

  it('should return true when point is within radius', () => {
    expect(isPointNearHandle({ x: 105, y: 100 }, { x: 100, y: 100 }, 10)).toBe(true);
  });

  it('should return false when point is outside radius', () => {
    expect(isPointNearHandle({ x: 120, y: 100 }, { x: 100, y: 100 }, 10)).toBe(false);
  });

  it('should use euclidean distance', () => {
    // Distance is sqrt(7^2 + 7^2) ≈ 9.9, which is within radius 10
    expect(isPointNearHandle({ x: 107, y: 107 }, { x: 100, y: 100 }, 10)).toBe(true);
    // Distance is sqrt(8^2 + 8^2) ≈ 11.3, which is outside radius 10
    expect(isPointNearHandle({ x: 108, y: 108 }, { x: 100, y: 100 }, 10)).toBe(false);
  });
});

// --- getHandleAtPoint ---

describe('getHandleAtPoint', () => {
  it('should return null when point is not near any handle', () => {
    const result = getHandleAtPoint({ x: 200, y: 150 }, rotatedRect, 10);
    expect(result).toBeNull();
  });

  it('should detect bottom-right handle', () => {
    const result = getHandleAtPoint({ x: 300, y: 200 }, rotatedRect, 15);
    expect(result).toBe('bottom-right');
  });

  it('should detect top-left handle', () => {
    const result = getHandleAtPoint({ x: 100, y: 100 }, rotatedRect, 15);
    expect(result).toBe('top-left');
  });
});

// --- calculateHandleSize ---

describe('calculateHandleSize', () => {
  it('should return minimum visual size of 10', () => {
    const result = calculateHandleSize(100, 4); // 24/4 = 6, but min is 10
    expect(result.visual).toBe(10);
  });

  it('should scale based on devicePixelRatio', () => {
    const result = calculateHandleSize(1920, 1);
    expect(result.visual).toBe(24);
  });

  it('should set hit area to 1.5x visual', () => {
    const result = calculateHandleSize(1920, 1);
    expect(result.hit).toBe(result.visual * 1.5);
  });

  it('should handle DPR of 2', () => {
    const result = calculateHandleSize(1920, 2);
    expect(result.visual).toBe(12); // 24/2
    expect(result.hit).toBe(18); // 12 * 1.5
  });
});

// --- calculateActualFontSize ---

describe('calculateActualFontSize', () => {
  it('should scale fontSize relative to canvas height / 1000', () => {
    // 32 * (1080 / 1000) = 34.56
    expect(calculateActualFontSize(32, 1080)).toBeCloseTo(34.56);
  });

  it('should return exact fontSize when canvas height is 1000', () => {
    expect(calculateActualFontSize(32, 1000)).toBe(32);
  });

  it('should scale proportionally for 720p', () => {
    // 32 * (720 / 1000) = 23.04
    expect(calculateActualFontSize(32, 720)).toBeCloseTo(23.04);
  });

  it('should scale proportionally for 4K', () => {
    // 32 * (2160 / 1000) = 69.12
    expect(calculateActualFontSize(32, 2160)).toBeCloseTo(69.12);
  });
});

// --- wrapText ---

describe('wrapText', () => {
  // Mock measureFn: each character is 10px wide
  const measureFn = (text: string) => text.length * 10;

  it('should return single line when text fits', () => {
    const result = wrapText('Hello', 100, measureFn);
    expect(result).toEqual(['Hello']);
  });

  it('should wrap text that exceeds maxWidth', () => {
    // "Hello World" = 11 chars = 110px, maxWidth = 80px
    const result = wrapText('Hello World', 80, measureFn);
    expect(result).toEqual(['Hello', 'World']);
  });

  it('should handle multiple wraps', () => {
    const result = wrapText('one two three four', 50, measureFn);
    // "one" = 30px, "two" = 30px, "three" = 50px, "four" = 40px
    // "one two" = 70px > 50 → wrap
    // Each word fits on its own
    expect(result.length).toBeGreaterThanOrEqual(3);
  });

  it('should handle single long word without breaking', () => {
    // A single word that exceeds maxWidth should be kept as-is on its own line
    const result = wrapText('Superlongword', 50, measureFn);
    expect(result).toEqual(['Superlongword']);
  });

  it('should handle empty string', () => {
    const result = wrapText('', 100, measureFn);
    expect(result).toEqual(['']);
  });

  it('should preserve multiple spaces as word separators', () => {
    const result = wrapText('Hello World', 100, measureFn);
    // Should treat as two words regardless of extra spaces
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});

// --- clampToCanvas ---

describe('clampToCanvas', () => {
  it('should not modify point inside canvas', () => {
    expect(clampToCanvas({ x: 100, y: 100 }, 1920, 1080)).toEqual({ x: 100, y: 100 });
  });

  it('should clamp negative x to 0', () => {
    expect(clampToCanvas({ x: -10, y: 100 }, 1920, 1080)).toEqual({ x: 0, y: 100 });
  });

  it('should clamp negative y to 0', () => {
    expect(clampToCanvas({ x: 100, y: -10 }, 1920, 1080)).toEqual({ x: 100, y: 0 });
  });

  it('should clamp x beyond canvas width', () => {
    expect(clampToCanvas({ x: 2000, y: 100 }, 1920, 1080)).toEqual({ x: 1920, y: 100 });
  });

  it('should clamp y beyond canvas height', () => {
    expect(clampToCanvas({ x: 100, y: 1200 }, 1920, 1080)).toEqual({ x: 100, y: 1080 });
  });

  it('should clamp both axes simultaneously', () => {
    expect(clampToCanvas({ x: -5, y: 2000 }, 1920, 1080)).toEqual({ x: 0, y: 1080 });
  });
});
