import { useEffect } from 'react';

interface UseAnnotationKeyboardProps {
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onDelete: () => void;
  readonly onEscape: () => void;
  readonly enabled: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly hasSelection: boolean;
}

export function useAnnotationKeyboard({
  onUndo,
  onRedo,
  onDelete,
  onEscape,
  enabled,
  canUndo,
  canRedo,
  hasSelection,
}: UseAnnotationKeyboardProps) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isEditing = target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (canUndo) {
          e.preventDefault();
          onUndo();
        }
        return;
      }

      // Ctrl+Shift+Z / Cmd+Shift+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        if (canRedo) {
          e.preventDefault();
          onRedo();
        }
        return;
      }

      // Don't intercept keys while editing text
      if (isEditing) return;

      // Delete / Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && hasSelection) {
        e.preventDefault();
        onDelete();
        return;
      }

      // Escape
      if (e.key === 'Escape') {
        e.preventDefault();
        onEscape();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, canUndo, canRedo, hasSelection, onUndo, onRedo, onDelete, onEscape]);
}
