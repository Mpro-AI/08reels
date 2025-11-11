'use client';

import { Pen, Image, Type, MousePointer2, Save, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import type { AnnotationMode } from '@/app/videos/[id]/page';

interface AnnotationToolbarProps {
  mode: AnnotationMode;
  onModeChange: (mode: AnnotationMode) => void;
  color: string;
  onColorChange: (color: string) => void;
  lineWidth: number;
  onLineWidthChange: (width: number) => void;
  onSave: () => void;
  onExit: () => void;
  isSavingDisabled: boolean;
  isUploading: boolean;
}

const colors = ['#FF0000', '#FFFF00', '#0000FF', '#FFFFFF', '#000000'];
const lineWidths = [2, 5, 10];

export default function AnnotationToolbar({
  mode,
  onModeChange,
  color,
  onColorChange,
  lineWidth,
  onLineWidthChange,
  onSave,
  onExit,
  isSavingDisabled,
  isUploading,
}: AnnotationToolbarProps) {
  return (
    <div className="bg-card/80 backdrop-blur-sm border rounded-lg p-2 flex items-center gap-2 shadow-lg">
      <ToggleGroup type="single" value={mode} onValueChange={(value) => onModeChange(value as AnnotationMode)}>
        <ToggleGroupItem value="select" aria-label="Select element">
          <MousePointer2 className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="pen" aria-label="Pen tool">
          <Pen className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>
      
      {(mode === 'pen' || mode === 'text') && (
        <>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-1">
            {colors.map((c) => (
              <Button
                key={c}
                variant="outline"
                size="icon"
                className={cn('h-6 w-6 rounded-full p-0 border-2', color === c ? 'border-primary' : 'border-transparent')}
                style={{ backgroundColor: c }}
                onClick={() => onColorChange(c)}
              />
            ))}
          </div>
        </>
      )}

      {mode === 'pen' && (
         <>
          <Separator orientation="vertical" className="h-6" />
           <div className="flex items-center gap-2">
            {lineWidths.map((w) => (
                <Button 
                    key={w}
                    variant={lineWidth === w ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onLineWidthChange(w)}
                >
                    <div className="bg-foreground rounded-full" style={{ width: w + 2, height: w + 2 }}/>
                </Button>
            ))}
           </div>
         </>
      )}

      <Separator orientation="vertical" className="h-6 ml-auto" />

      {isUploading ? (
        <Button variant="outline" size="icon" disabled>
          <Loader2 className="h-4 w-4 animate-spin" />
        </Button>
      ) : (
        <>
          <Button variant="outline" size="icon" onClick={onExit} title="取消">
            <X className="h-4 w-4" />
          </Button>
          <Button size="icon" onClick={onSave} disabled={isSavingDisabled} title="儲存">
            <Save className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}
