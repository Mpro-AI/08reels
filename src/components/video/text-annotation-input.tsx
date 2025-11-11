'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Check } from 'lucide-react';

interface TextAnnotationInputProps {
  x: number;
  y: number;
  onComplete: (text: string) => void;
  onCancel: () => void;
}

const TextAnnotationInput: React.FC<TextAnnotationInputProps> = ({ x, y, onComplete, onCancel }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel]);

  const handleComplete = () => {
    if (text.trim()) {
      onComplete(text.trim());
    } else {
      onCancel();
    }
  };

  return (
    <div
      className="absolute z-30 p-2 bg-background border border-primary rounded-lg shadow-lg flex flex-col gap-2"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)', // Center on the click point
      }}
      onClick={(e) => e.stopPropagation()} // Prevent clicks inside from propagating to the canvas
    >
      <Textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="輸入註解文字..."
        className="w-64 h-24"
      />
      <Button onClick={handleComplete} size="sm">
        <Check className="mr-2 h-4 w-4" />
        完成
      </Button>
    </div>
  );
};

export default TextAnnotationInput;