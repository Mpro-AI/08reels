import { useState, useCallback } from 'react';
import type { Point } from './types';

interface UseDropZoneProps {
  readonly onDrop: (file: File, screenPosition: Point) => void;
  readonly enabled: boolean;
}

export function useDropZone({ onDrop, enabled }: UseDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (enabled) {
      setIsDragging(true);
    }
  }, [enabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!enabled) return;

    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const screenPos: Point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    onDrop(file, screenPos);
  }, [enabled, onDrop]);

  return {
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
