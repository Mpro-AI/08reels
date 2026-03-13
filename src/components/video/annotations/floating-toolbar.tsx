'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import type { Annotation, TextAnnotationData, ImageAnnotationData } from '@/lib/types';
import type { Point, CanvasScale } from './types';
import { canvasToScreen } from './utils';

const TEXT_COLORS = [
  '#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#FF69B4',
];

const BG_COLORS = [
  '', 'rgba(0,0,0,0.7)', 'rgba(255,255,255,0.7)',
  'rgba(255,255,0,0.5)', 'rgba(255,0,0,0.5)', 'rgba(0,0,255,0.5)',
];

const FONT_SIZES = [16, 20, 24, 32, 40, 48, 64, 80];

interface FloatingToolbarProps {
  readonly annotation: Annotation;
  readonly canvasScale: CanvasScale;
  readonly onFontSizeChange: (size: number) => void;
  readonly onColorChange: (color: string) => void;
  readonly onBackgroundColorChange: (color: string) => void;
  readonly onDelete: () => void;
}

export default function FloatingToolbar({
  annotation,
  canvasScale,
  onFontSizeChange,
  onColorChange,
  onBackgroundColorChange,
  onDelete,
}: FloatingToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<'above' | 'below'>('above');

  const data = annotation.data as ImageAnnotationData | TextAnnotationData;
  const centerCanvas: Point = {
    x: data.x + data.width / 2,
    y: data.y,
  };
  const screenPos = canvasToScreen(centerCanvas, canvasScale);

  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < 60) {
      setPosition('below');
    } else {
      setPosition('above');
    }
  }, [screenPos.y]);

  const isText = annotation.type === 'text';
  const textData = isText ? (annotation.data as TextAnnotationData) : null;

  return (
    <div
      ref={toolbarRef}
      data-floating-toolbar
      className="absolute z-40 flex items-center gap-1 bg-card/95 backdrop-blur-sm border rounded-lg px-2 py-1 shadow-lg"
      style={{
        left: screenPos.x,
        top: position === 'above' ? screenPos.y - 8 : screenPos.y + (data.height / canvasScale.scaleY) + 8,
        transform: position === 'above' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {isText && textData && (
        <>
          {/* Font size */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                {textData.fontSize}px
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="center">
              <div className="space-y-2">
                <Label className="text-xs">字體大小</Label>
                <Slider
                  value={[textData.fontSize]}
                  onValueChange={([v]) => onFontSizeChange(v)}
                  min={12}
                  max={96}
                  step={2}
                />
                <div className="flex flex-wrap gap-1">
                  {FONT_SIZES.map((s) => (
                    <Button
                      key={s}
                      variant={textData.fontSize === s ? 'default' : 'outline'}
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => onFontSizeChange(s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Text color */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0">
                <div className="w-4 h-4 rounded border" style={{ backgroundColor: textData.color }} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="center">
              <div className="flex flex-wrap gap-1 max-w-[180px]">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`w-6 h-6 rounded border-2 ${textData.color === c ? 'border-primary scale-110' : 'border-muted'}`}
                    style={{ backgroundColor: c }}
                    onClick={() => onColorChange(c)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Background color */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0">
                <div
                  className="w-4 h-4 rounded border"
                  style={{
                    backgroundColor: textData.backgroundColor || 'transparent',
                    backgroundImage: !textData.backgroundColor
                      ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                      : undefined,
                    backgroundSize: '4px 4px',
                  }}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="center">
              <div className="flex flex-wrap gap-1 max-w-[180px]">
                {BG_COLORS.map((c, i) => (
                  <button
                    key={i}
                    className={`w-6 h-6 rounded border-2 ${textData.backgroundColor === c ? 'border-primary scale-110' : 'border-muted'}`}
                    style={{
                      backgroundColor: c || 'transparent',
                      backgroundImage: !c
                        ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                        : undefined,
                      backgroundSize: '4px 4px',
                    }}
                    onClick={() => onBackgroundColorChange(c)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </>
      )}

      {/* Delete */}
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={onDelete}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
