'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Annotation, PenAnnotationData } from '@/lib/types';

interface AnnotationCanvasProps {
  width: number;
  height: number;
  annotations: Annotation[];
  onAddAnnotation: (data: PenAnnotationData) => void;
  isDrawing: boolean;
}

const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  width,
  height,
  annotations,
  onAddAnnotation,
  isDrawing,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);

  const getCanvasContext = () => {
    const canvas = canvasRef.current;
    return canvas?.getContext('2d');
  };

  const drawPath = (ctx: CanvasRenderingContext2D, path: { x: number; y: number }[], color: string, lineWidth: number) => {
    if (path.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  useEffect(() => {
    const ctx = getCanvasContext();
    if (!ctx || !canvasRef.current) return;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    annotations.forEach((annotation) => {
      if (annotation.type === 'pen') {
        const data = annotation.data as PenAnnotationData;
        drawPath(ctx, data.path, data.color, data.lineWidth);
      }
    });

    // Draw the current path being drawn
    if (currentPath.length > 1) {
        drawPath(ctx, currentPath, '#FF0000', 3);
    }

  }, [annotations, currentPath, width, height]);

  const getCoordinates = (event: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in event.nativeEvent) {
      return {
        x: (event.nativeEvent.touches[0].clientX - rect.left) * scaleX,
        y: (event.nativeEvent.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (event.nativeEvent.offsetX) * scaleX,
      y: (event.nativeEvent.offsetY) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const coords = getCoordinates(e);
    if (!coords) return;
    setDrawing(true);
    setCurrentPath([coords]);
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !drawing) return;
    const coords = getCoordinates(e);
    if (!coords) return;
    setCurrentPath((prev) => [...prev, coords]);
  };

  const handleMouseUp = () => {
    if (!isDrawing || !drawing) return;
    setDrawing(false);
    if (currentPath.length > 1) {
      const annotationData: PenAnnotationData = {
        path: currentPath,
        color: '#FF0000', // Hardcoded for now
        lineWidth: 3,    // Hardcoded for now
      };
      onAddAnnotation(annotationData);
    }
    setCurrentPath([]);
  };

  if (!isDrawing && annotations.length === 0) {
    return null;
  }
  
  const pointerEventsClass = isDrawing ? 'auto' : 'none';

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchMove={handleMouseMove}
      onTouchEnd={handleMouseUp}
      className="absolute top-0 left-0"
      style={{ pointerEvents: pointerEventsClass }}
    />
  );
};

export default AnnotationCanvas;
