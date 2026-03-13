import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDropZone } from '@/components/video/annotations/use-drop-zone';

describe('useDropZone', () => {
  it('should initialize with isDragging false', () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useDropZone({ onDrop, enabled: true }));
    expect(result.current.isDragging).toBe(false);
  });

  it('should set isDragging true on dragOver', () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useDropZone({ onDrop, enabled: true }));

    act(() => {
      result.current.handleDragOver({
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as any);
    });

    expect(result.current.isDragging).toBe(true);
  });

  it('should set isDragging false on dragLeave', () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useDropZone({ onDrop, enabled: true }));

    act(() => {
      result.current.handleDragOver({ preventDefault: vi.fn(), stopPropagation: vi.fn() } as any);
    });
    expect(result.current.isDragging).toBe(true);

    act(() => {
      result.current.handleDragLeave({ preventDefault: vi.fn() } as any);
    });
    expect(result.current.isDragging).toBe(false);
  });

  it('should call onDrop with file and position on drop', () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useDropZone({ onDrop, enabled: true }));

    const mockFile = new File(['test'], 'image.png', { type: 'image/png' });
    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: {
        files: [mockFile],
      },
      clientX: 200,
      clientY: 300,
      currentTarget: {
        getBoundingClientRect: () => ({ left: 50, top: 100 }),
      },
    } as any;

    act(() => {
      result.current.handleDrop(mockEvent);
    });

    expect(onDrop).toHaveBeenCalledWith(mockFile, { x: 150, y: 200 });
    expect(result.current.isDragging).toBe(false);
  });

  it('should reject non-image files', () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useDropZone({ onDrop, enabled: true }));

    const mockFile = new File(['test'], 'doc.pdf', { type: 'application/pdf' });
    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: { files: [mockFile] },
      clientX: 200,
      clientY: 300,
      currentTarget: {
        getBoundingClientRect: () => ({ left: 50, top: 100 }),
      },
    } as any;

    act(() => {
      result.current.handleDrop(mockEvent);
    });

    expect(onDrop).not.toHaveBeenCalled();
  });

  it('should not trigger when disabled', () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() => useDropZone({ onDrop, enabled: false }));

    const mockFile = new File(['test'], 'image.png', { type: 'image/png' });
    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: { files: [mockFile] },
      clientX: 200,
      clientY: 300,
      currentTarget: {
        getBoundingClientRect: () => ({ left: 50, top: 100 }),
      },
    } as any;

    act(() => {
      result.current.handleDrop(mockEvent);
    });

    expect(onDrop).not.toHaveBeenCalled();
  });
});
