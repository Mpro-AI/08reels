'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Point, CanvasScale } from './types';
import { canvasToScreen } from './utils';

interface InlineTextEditorProps {
  readonly canvasPosition: Point;
  readonly scale: CanvasScale;
  readonly fontSize: number;
  readonly color: string;
  readonly backgroundColor?: string;
  readonly initialText?: string;
  readonly onComplete: (text: string) => void;
  readonly onCancel: () => void;
  readonly onPreviewChange?: (text: string) => void;
}

export default function InlineTextEditor({
  canvasPosition,
  scale,
  fontSize,
  color,
  backgroundColor,
  initialText = '',
  onComplete,
  onCancel,
  onPreviewChange,
}: InlineTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [hasText, setHasText] = useState(initialText.length > 0);

  const screenPos = canvasToScreen(canvasPosition, scale);
  const screenFontSize = fontSize / scale.scaleX;

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();

    if (initialText) {
      el.textContent = initialText;
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, []);

  const handleComplete = useCallback(() => {
    const text = editorRef.current?.textContent?.trim() || '';
    if (text) {
      onComplete(text);
    } else {
      onCancel();
    }
  }, [onComplete, onCancel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleComplete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, handleComplete]);

  const handleInput = useCallback(() => {
    const text = editorRef.current?.textContent || '';
    setHasText(text.trim().length > 0);
    onPreviewChange?.(text);
  }, [onPreviewChange]);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (relatedTarget?.closest('[data-floating-toolbar]')) return;
    handleComplete();
  }, [handleComplete]);

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      data-inline-text-editor
      className="absolute z-30 outline-none cursor-text"
      style={{
        left: screenPos.x,
        top: screenPos.y,
        transform: 'translate(-50%, -50%)',
        fontSize: `${screenFontSize}px`,
        fontFamily: 'sans-serif',
        fontWeight: 500,
        color,
        backgroundColor: backgroundColor || 'transparent',
        padding: '2px 4px',
        borderRadius: '2px',
        minWidth: '20px',
        minHeight: `${screenFontSize}px`,
        maxWidth: `${scale.displayWidth * 0.8}px`,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        lineHeight: 1.2,
        border: hasText ? 'none' : '1px dashed rgba(255,255,255,0.5)',
        caretColor: color,
      }}
      onInput={handleInput}
      onBlur={handleBlur}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    />
  );
}
