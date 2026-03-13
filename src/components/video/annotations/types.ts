import type { Annotation, ImageAnnotationData, TextAnnotationData } from '@/lib/types';

// --- Coordinate types ---

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface RotatedRect extends Rect {
  readonly rotation: number; // radians
}

// --- Handle types ---

export type HandlePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'rotation';

export interface HandleHitResult {
  readonly position: HandlePosition;
  readonly annotation: Annotation;
}

// --- Canvas scaling ---

export interface CanvasScale {
  readonly scaleX: number;
  readonly scaleY: number;
  readonly displayWidth: number;
  readonly displayHeight: number;
  readonly canvasWidth: number;
  readonly canvasHeight: number;
}

// --- History (undo/redo) ---

export type AnnotationAction =
  | { readonly type: 'add'; readonly annotation: Annotation }
  | { readonly type: 'delete'; readonly annotationId: string; readonly annotation: Annotation }
  | { readonly type: 'update'; readonly annotationId: string; readonly before: Annotation; readonly after: Annotation };

export interface HistoryState {
  readonly annotations: readonly Annotation[];
  readonly past: readonly AnnotationAction[];
  readonly future: readonly AnnotationAction[];
}

// --- Interaction state ---

export type InteractionAction = 'none' | 'drawing' | 'dragging' | 'resizing' | 'rotating' | 'editing-text';

export type AnnotationMode = 'select' | 'pen' | 'text' | 'image';

// --- Floating toolbar ---

export interface FloatingToolbarProps {
  readonly selectedAnnotation: Annotation | null;
  readonly position: Point;
  readonly onFontSizeChange: (size: number) => void;
  readonly onColorChange: (color: string) => void;
  readonly onBackgroundColorChange: (color: string) => void;
  readonly onDelete: () => void;
}
