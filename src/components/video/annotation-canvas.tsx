'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Annotation, PenAnnotationData, ImageAnnotationData } from '@/lib/types';

interface AnnotationCanvasProps {
  width: number;
  height: number;
  annotations: Annotation[];
  onAddAnnotation: (data: PenAnnotationData | {x: number, y: number}) => void;
  annotationMode: 'pen' | 'image' | null;
}

const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  width,
  height,
  annotations,
  onAddAnnotation,
  annotationMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

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

  const drawImage = (ctx: CanvasRenderingContext2D, data: ImageAnnotationData) => {
    const cachedImage = imageCache.current.get(data.url);
    if (cachedImage) {
      ctx.drawImage(cachedImage, data.x, data.y, data.width, data.height);
    } else {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = data.url;
      img.onload = () => {
        imageCache.current.set(data.url, img);
        // Request a re-render by calling a dummy state update or via a parent prop
        // For simplicity, we'll rely on the parent component's re-renders for now.
        // A more robust solution might involve a state update here.
        if (canvasRef.current) {
           const currentCtx = getCanvasContext();
           if(currentCtx) {
             redrawCanvas(currentCtx);
           }
        }
      };
    }
  }

  const redrawCanvas = (ctx: CanvasRenderingContext2D) => {
     if (!canvasRef.current) return;
     ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      annotations.forEach((annotation) => {
        if (annotation.type === 'pen') {
          drawPath(ctx, annotation.data.path, annotation.data.color, annotation.data.lineWidth);
        } else if (annotation.type === 'image') {
          drawImage(ctx, annotation.data as ImageAnnotationData);
        }
      });
      if (annotationMode === 'pen' && currentPath.length > 1) {
        drawPath(ctx, currentPath, '#FF0000', 3);
      }
  }

  useEffect(() => {
    const ctx = getCanvasContext();
    if (!ctx || !canvasRef.current) return;
    redrawCanvas(ctx);
  }, [annotations, currentPath, width, height, annotationMode]);

  const getCoordinates = (event: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    if ('touches' in event.nativeEvent) {
      clientX = event.nativeEvent.touches[0].clientX;
      clientY = event.nativeEvent.touches[0].clientY;
    } else {
      clientX = event.nativeEvent.clientX;
      clientY = event.nativeEvent.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCoordinates(e);
    if (!coords) return;

    if (annotationMode === 'pen') {
      setDrawing(true);
      setCurrentPath([coords]);
    } else if (annotationMode === 'image') {
       onAddAnnotation({ x: coords.x, y: coords.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (annotationMode !== 'pen' || !drawing) return;
    const coords = getCoordinates(e);
    if (!coords) return;
    setCurrentPath((prev) => [...prev, coords]);
  };

  const handleMouseUp = () => {
    if (annotationMode !== 'pen' || !drawing) return;
    setDrawing(false);
    if (currentPath.length > 1) {
      const annotationData: PenAnnotationData = {
        path: currentPath,
        color: '#FF0000',
        lineWidth: 3,
      };
      onAddAnnotation(annotationData);
    }
    setCurrentPath([]);
  };
  
  if (annotationMode === null && annotations.length === 0) {
    return null;
  }
  
  const pointerEventsClass = annotationMode !== null ? 'auto' : 'none';
  const cursorClass = annotationMode === 'image' ? 'crosshair' : (annotationMode === 'pen' ? 'auto' : 'default');


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
      style={{ pointerEvents: pointerEventsClass, cursor: cursorClass }}
    />
  );
};

export default AnnotationCanvas;
