'use client';

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Check, X, Type, Palette } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';

interface TextAnnotationInputProps {
  x: number;
  y: number;
  onComplete: (text: string, fontSize: number, color: string, backgroundColor?: string) => void;
  onCancel: () => void;
  onPreviewChange?: (text: string, fontSize: number, color: string, backgroundColor?: string) => void;
  initialColor?: string;
  containerRef?: React.RefObject<HTMLElement | null>; // 容器參考，用於計算邊界
}

const PRESET_COLORS = [
  '#FFFFFF', // 白色
  '#000000', // 黑色
  '#FF0000', // 紅色
  '#00FF00', // 綠色
  '#0000FF', // 藍色
  '#FFFF00', // 黃色
  '#FF00FF', // 紫紅色
  '#00FFFF', // 青色
  '#FFA500', // 橙色
  '#FF69B4', // 粉紅色
];

const PRESET_BG_COLORS = [
  '', // 無背景
  'rgba(0, 0, 0, 0.7)', // 半透明黑色
  'rgba(255, 255, 255, 0.7)', // 半透明白色
  'rgba(255, 255, 0, 0.5)', // 半透明黃色 (螢光筆效果)
  'rgba(255, 0, 0, 0.5)', // 半透明紅色
  'rgba(0, 255, 0, 0.5)', // 半透明綠色
  'rgba(0, 0, 255, 0.5)', // 半透明藍色
];

const FONT_SIZES = [16, 20, 24, 32, 40, 48, 64, 80];

const TextAnnotationInput: React.FC<TextAnnotationInputProps> = ({
  x,
  y,
  onComplete,
  onCancel,
  onPreviewChange,
  initialColor = '#FFFFFF',
  containerRef,
}) => {
  const [text, setText] = useState('');
  const [fontSize, setFontSize] = useState(32);
  const [textColor, setTextColor] = useState(initialColor);
  const [backgroundColor, setBackgroundColor] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number; transformY: string }>({
    left: x,
    top: y,
    transformY: '-100%', // 預設顯示在點擊位置上方
  });

  // 計算最佳位置
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const dialogRect = dialog.getBoundingClientRect();
    const dialogHeight = dialogRect.height;
    const dialogWidth = dialogRect.width;

    // 獲取容器邊界（如果有提供）或使用視窗邊界
    let containerTop = 0;
    let containerLeft = 0;
    let containerRight = window.innerWidth;
    let containerBottom = window.innerHeight;

    if (containerRef?.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      containerTop = containerRect.top;
      containerLeft = containerRect.left;
      containerRight = containerRect.right;
      containerBottom = containerRect.bottom;
    }

    // 計算實際的螢幕位置
    const absoluteX = containerRef?.current
      ? containerRef.current.getBoundingClientRect().left + x
      : x;
    const absoluteY = containerRef?.current
      ? containerRef.current.getBoundingClientRect().top + y
      : y;

    let newLeft = x;
    let newTop = y;
    let transformY = '-100%'; // 預設顯示在上方

    // 檢查上方是否有足夠空間（考慮 header 高度，約 60px）
    const minTopSpace = 80; // header + 一些間距
    if (absoluteY - dialogHeight < minTopSpace) {
      // 沒有足夠空間在上方，改為顯示在下方
      transformY = '10px';
      newTop = y;
    } else {
      // 顯示在上方
      transformY = '-100%';
      newTop = y - 10;
    }

    // 檢查左右邊界
    const halfWidth = dialogWidth / 2;
    if (absoluteX - halfWidth < containerLeft + 10) {
      // 太靠左，調整位置
      newLeft = halfWidth + 10;
    } else if (absoluteX + halfWidth > containerRight - 10) {
      // 太靠右，調整位置
      newLeft = x - (absoluteX + halfWidth - containerRight) - 10;
    }

    setPosition({ left: newLeft, top: newTop, transformY });
  }, [x, y, containerRef]);

  useEffect(() => {
    textareaRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
      // Enter + Ctrl/Cmd 完成輸入
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        handleComplete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel, text]);

  // 即時預覽更新
  useEffect(() => {
    if (onPreviewChange) {
      onPreviewChange(text, fontSize, textColor, backgroundColor || undefined);
    }
  }, [text, fontSize, textColor, backgroundColor, onPreviewChange]);

  const handleComplete = () => {
    if (text.trim()) {
      onComplete(text.trim(), fontSize, textColor, backgroundColor || undefined);
    } else {
      onCancel();
    }
  };

  return (
    <div
      ref={dialogRef}
      className="absolute z-30 p-3 bg-background border border-primary rounded-lg shadow-xl flex flex-col gap-3"
      style={{
        left: position.left,
        top: position.top,
        transform: `translate(-50%, ${position.transformY})`,
        minWidth: '320px',
        maxWidth: 'calc(100vw - 20px)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 標題列 */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium flex items-center gap-2">
          <Type className="h-4 w-4" />
          文字註解
        </span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* 文字輸入區 */}
      <Textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="輸入註解文字..."
        className="w-full min-h-[80px] resize-none"
        style={{
          color: textColor,
          backgroundColor: backgroundColor || 'transparent',
          fontWeight: 500,
        }}
      />

      {/* 樣式設定區 */}
      <div className="flex flex-wrap items-center gap-2">
        {/* 字體大小 */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 px-2">
              <span className="text-xs mr-1">大小</span>
              <span className="font-mono">{fontSize}px</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            <div className="space-y-3">
              <Label className="text-xs">字體大小: {fontSize}px</Label>
              <Slider
                value={[fontSize]}
                onValueChange={(value) => setFontSize(value[0])}
                min={12}
                max={96}
                step={2}
              />
              <div className="flex flex-wrap gap-1">
                {FONT_SIZES.map((size) => (
                  <Button
                    key={size}
                    variant={fontSize === size ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setFontSize(size)}
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* 文字顏色 */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 px-2">
              <div
                className="w-4 h-4 rounded border mr-1"
                style={{ backgroundColor: textColor }}
              />
              <span className="text-xs">文字</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <div className="space-y-2">
              <Label className="text-xs">文字顏色</Label>
              <div className="flex flex-wrap gap-1 max-w-[200px]">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-6 h-6 rounded border-2 transition-all ${
                      textColor === color ? 'border-primary scale-110' : 'border-muted'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setTextColor(color)}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Label className="text-xs">自訂:</Label>
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-8 h-8 cursor-pointer rounded border"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* 背景顏色 */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 px-2">
              <div
                className="w-4 h-4 rounded border mr-1"
                style={{
                  backgroundColor: backgroundColor || 'transparent',
                  backgroundImage: !backgroundColor
                    ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                    : undefined,
                  backgroundSize: '4px 4px',
                  backgroundPosition: '0 0, 0 2px, 2px -2px, -2px 0px',
                }}
              />
              <span className="text-xs">背景</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <div className="space-y-2">
              <Label className="text-xs">背景顏色</Label>
              <div className="flex flex-wrap gap-1 max-w-[200px]">
                {PRESET_BG_COLORS.map((color, idx) => (
                  <button
                    key={idx}
                    className={`w-6 h-6 rounded border-2 transition-all ${
                      backgroundColor === color ? 'border-primary scale-110' : 'border-muted'
                    }`}
                    style={{
                      backgroundColor: color || 'transparent',
                      backgroundImage: !color
                        ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                        : undefined,
                      backgroundSize: '4px 4px',
                      backgroundPosition: '0 0, 0 2px, 2px -2px, -2px 0px',
                    }}
                    onClick={() => setBackgroundColor(color)}
                    title={color ? color : '無背景'}
                  />
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* 預覽區 */}
      <div className="p-2 rounded bg-muted/50 border">
        <Label className="text-xs text-muted-foreground mb-1 block">預覽:</Label>
        <div
          className="p-2 rounded inline-block max-w-full overflow-hidden"
          style={{
            backgroundColor: backgroundColor || 'transparent',
          }}
        >
          <span
            style={{
              fontSize: `${Math.min(fontSize, 24)}px`, // 預覽區限制最大字體
              color: textColor,
              wordBreak: 'break-word',
            }}
          >
            {text || '輸入文字...'}
          </span>
        </div>
      </div>

      {/* 按鈕區 */}
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">
          Ctrl+Enter 完成
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            取消
          </Button>
          <Button size="sm" onClick={handleComplete} disabled={!text.trim()}>
            <Check className="mr-1 h-4 w-4" />
            完成
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TextAnnotationInput;
