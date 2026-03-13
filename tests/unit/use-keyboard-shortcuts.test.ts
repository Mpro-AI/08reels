import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAnnotationKeyboard } from '@/components/video/annotations/use-keyboard-shortcuts';

function fireKeyDown(key: string, opts: Partial<KeyboardEventInit> = {}) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opts }));
}

describe('useAnnotationKeyboard', () => {
  it('should call onUndo on Ctrl+Z', () => {
    const handlers = {
      onUndo: vi.fn(),
      onRedo: vi.fn(),
      onDelete: vi.fn(),
      onEscape: vi.fn(),
      enabled: true,
      canUndo: true,
      canRedo: false,
      hasSelection: false,
    };
    renderHook(() => useAnnotationKeyboard(handlers));

    fireKeyDown('z', { ctrlKey: true });
    expect(handlers.onUndo).toHaveBeenCalledTimes(1);
  });

  it('should call onRedo on Ctrl+Shift+Z', () => {
    const handlers = {
      onUndo: vi.fn(),
      onRedo: vi.fn(),
      onDelete: vi.fn(),
      onEscape: vi.fn(),
      enabled: true,
      canUndo: false,
      canRedo: true,
      hasSelection: false,
    };
    renderHook(() => useAnnotationKeyboard(handlers));

    fireKeyDown('z', { ctrlKey: true, shiftKey: true });
    expect(handlers.onRedo).toHaveBeenCalledTimes(1);
  });

  it('should call onDelete on Delete key when something is selected', () => {
    const handlers = {
      onUndo: vi.fn(),
      onRedo: vi.fn(),
      onDelete: vi.fn(),
      onEscape: vi.fn(),
      enabled: true,
      canUndo: false,
      canRedo: false,
      hasSelection: true,
    };
    renderHook(() => useAnnotationKeyboard(handlers));

    fireKeyDown('Delete');
    expect(handlers.onDelete).toHaveBeenCalledTimes(1);
  });

  it('should call onDelete on Backspace when something is selected', () => {
    const handlers = {
      onUndo: vi.fn(),
      onRedo: vi.fn(),
      onDelete: vi.fn(),
      onEscape: vi.fn(),
      enabled: true,
      canUndo: false,
      canRedo: false,
      hasSelection: true,
    };
    renderHook(() => useAnnotationKeyboard(handlers));

    fireKeyDown('Backspace');
    expect(handlers.onDelete).toHaveBeenCalledTimes(1);
  });

  it('should not call onDelete when nothing is selected', () => {
    const handlers = {
      onUndo: vi.fn(),
      onRedo: vi.fn(),
      onDelete: vi.fn(),
      onEscape: vi.fn(),
      enabled: true,
      canUndo: false,
      canRedo: false,
      hasSelection: false,
    };
    renderHook(() => useAnnotationKeyboard(handlers));

    fireKeyDown('Delete');
    expect(handlers.onDelete).not.toHaveBeenCalled();
  });

  it('should call onEscape on Escape', () => {
    const handlers = {
      onUndo: vi.fn(),
      onRedo: vi.fn(),
      onDelete: vi.fn(),
      onEscape: vi.fn(),
      enabled: true,
      canUndo: false,
      canRedo: false,
      hasSelection: false,
    };
    renderHook(() => useAnnotationKeyboard(handlers));

    fireKeyDown('Escape');
    expect(handlers.onEscape).toHaveBeenCalledTimes(1);
  });

  it('should not fire when disabled', () => {
    const handlers = {
      onUndo: vi.fn(),
      onRedo: vi.fn(),
      onDelete: vi.fn(),
      onEscape: vi.fn(),
      enabled: false,
      canUndo: true,
      canRedo: true,
      hasSelection: true,
    };
    renderHook(() => useAnnotationKeyboard(handlers));

    fireKeyDown('z', { ctrlKey: true });
    fireKeyDown('Delete');
    fireKeyDown('Escape');
    expect(handlers.onUndo).not.toHaveBeenCalled();
    expect(handlers.onDelete).not.toHaveBeenCalled();
    expect(handlers.onEscape).not.toHaveBeenCalled();
  });

  it('should not fire undo when canUndo is false', () => {
    const handlers = {
      onUndo: vi.fn(),
      onRedo: vi.fn(),
      onDelete: vi.fn(),
      onEscape: vi.fn(),
      enabled: true,
      canUndo: false,
      canRedo: false,
      hasSelection: false,
    };
    renderHook(() => useAnnotationKeyboard(handlers));

    fireKeyDown('z', { ctrlKey: true });
    expect(handlers.onUndo).not.toHaveBeenCalled();
  });
});
