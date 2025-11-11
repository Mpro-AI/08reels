'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Annotation, PenAnnotationData, ImageAnnotationData } from '@/lib/types';
import type { AnnotationMode } from '@/app/videos/[id]/page';


interface AnnotationCanvasProps {
  width: number;
  height: number;
  annotations: Annotation[];
  onAddAnnotation: (data: PenAnnotationData, type: 'pen') => void;
  onUpdateAnnotation: (annotation: Annotation) => void;
  annotationMode: AnnotationMode;
  penColor: string;
  penLineWidth: number;
  isAnnotating: boolean;
}

type Action = 'drawing' | 'dragging' | 'resizing' | 'rotating' | 'none';

// Constants for control handles
const HANDLE_SIZE = 8;
const ROTATION_HANDLE_OFFSET = 20;

const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  width,
  height,
  annotations,
  onAddAnnotation,
  onUpdateAnnotation,
  annotationMode,
  penColor,
  penLineWidth,
  isAnnotating,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [action, setAction] = useState<Action>('none');
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  const getCanvasContext = () => {
    return canvasRef.current?.getContext('2d');
  };

  // Helper to get mouse coordinates relative to the canvas
  const getCoords = (event: React.MouseEvent | React.TouchEvent) => {
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
      clientX = (event.nativeEvent as MouseEvent).clientX;
      clientY = (event.nativeEvent as MouseEvent).clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  // #region Drawing Logic
  const drawPenAnnotation = (ctx: CanvasRenderingContext2D, data: PenAnnotationData) => {
    if (data.path.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(data.path[0].x, data.path[0].y);
    for (let i = 1; i < data.path.length; i++) {
      ctx.lineTo(data.path[i].x, data.path[i].y);
    }
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const drawImageAnnotation = (ctx: CanvasRenderingContext2D, data: ImageAnnotationData, isSelected: boolean) => {
    const img = imageCache.current.get(data.url);
    if (!img) {
      const newImg = new Image();
      newImg.crossOrigin = "anonymous";
      newImg.src = data.url;
      newImg.onload = () => {
        imageCache.current.set(data.url, newImg);
        redrawCanvas();
      };
      return;
    }
    
    ctx.save();
    // Translate and rotate context
    ctx.translate(data.x + data.width / 2, data.y + data.height / 2);
    ctx.rotate(data.rotation);
    ctx.drawImage(img, -data.width / 2, -data.height / 2, data.width, data.height);
    ctx.restore();

    if (isSelected) {
      drawSelectionHandles(ctx, data);
    }
  };

  const drawSelectionHandles = (ctx: CanvasRenderingContext2D, data: ImageAnnotationData) => {
      ctx.save();
      ctx.translate(data.x + data.width / 2, data.y + data.height / 2);
      ctx.rotate(data.rotation);

      // Draw bounding box
      ctx.strokeStyle = '#09f';
      ctx.lineWidth = 1;
      ctx.strokeRect(-data.width / 2, -data.height / 2, data.width, data.height);
      
      // Draw resize handle (bottom-right)
      ctx.fillStyle = '#09f';
      ctx.fillRect(data.width / 2 - HANDLE_SIZE / 2, data.height / 2 - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);

      // Draw rotation handle (top-center)
      ctx.beginPath();
      ctx.moveTo(0, -data.height / 2);
      ctx.lineTo(0, -data.height / 2 - ROTATION_HANDLE_OFFSET);
      ctx.strokeStyle = '#09f';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -data.height / 2 - ROTATION_HANDLE_OFFSET, HANDLE_SIZE / 2, 0, 2 * Math.PI);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#09f';
      ctx.stroke();
      
      ctx.restore();
  };

  const redrawCanvas = () => {
    const ctx = getCanvasContext();
    if (!ctx || !canvasRef.current) return;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    annotations.forEach((annotation) => {
      const isSelected = annotation.id === selectedAnnotationId;
      if (annotation.type === 'pen') {
        drawPenAnnotation(ctx, annotation.data as PenAnnotationData);
      } else if (annotation.type === 'image') {
        drawImageAnnotation(ctx, annotation.data as ImageAnnotationData, isSelected);
      }
    });

    if (action === 'drawing' && currentPath.length > 1) {
       drawPenAnnotation(ctx, { path: currentPath, color: penColor, lineWidth: penLineWidth });
    }
  };
  // #endregion

  useEffect(() => {
    redrawCanvas();
  }, [annotations, selectedAnnotationId, currentPath, width, height, action, penColor, penLineWidth]);


  // #region Interaction Logic
  const getAnnotationAtPoint = (point: { x: number; y: number }) => {
    // Iterate backwards to select the top-most annotation
    for (let i = annotations.length - 1; i >= 0; i--) {
        const annotation = annotations[i];
        if (annotation.type === 'image') {
            const data = annotation.data as ImageAnnotationData;
            const centerX = data.x + data.width / 2;
            const centerY = data.y + data.height / 2;

            // Translate point to be relative to the annotation's center
            const translatedX = point.x - centerX;
            const translatedY = point.y - centerY;

            // Rotate the point in the opposite direction of the annotation's rotation
            const rotatedX = translatedX * Math.cos(-data.rotation) - translatedY * Math.sin(-data.rotation);
            const rotatedY = translatedX * Math.sin(-data.rotation) + translatedY * Math.cos(-data.rotation);

            // Check if the rotated point is within the un-rotated bounding box
            if (rotatedX >= -data.width / 2 && rotatedX <= data.width / 2 &&
                rotatedY >= -data.height / 2 && rotatedY <= data.height / 2) {
                return annotation;
            }
        }
    }
    return null;
  };
  
  const getActionForPoint = (point: {x:number, y:number}, annotation: Annotation): Action => {
      const data = annotation.data as ImageAnnotationData;
      const centerX = data.x + data.width / 2;
      const centerY = data.y + data.height / 2;
  
      // Transform point to annotation's local coordinate system
      const translatedX = point.x - centerX;
      const translatedY = point.y - centerY;
      const rotatedX = translatedX * Math.cos(-data.rotation) - translatedY * Math.sin(-data.rotation);
      const rotatedY = translatedX * Math.sin(-data.rotation) + translatedY * Math.cos(-data.rotation);
  
      // Check resize handle
      const resizeHandleX = data.width / 2;
      const resizeHandleY = data.height / 2;
      if (Math.abs(rotatedX - resizeHandleX) < HANDLE_SIZE && Math.abs(rotatedY - resizeHandleY) < HANDLE_SIZE) {
        return 'resizing';
      }
      
      // Check rotation handle
      const rotationHandleX = 0;
      const rotationHandleY = -data.height / 2 - ROTATION_HANDLE_OFFSET;
      if (Math.sqrt((rotatedX - rotationHandleX)**2 + (rotatedY - rotationHandleY)**2) < HANDLE_SIZE) {
          return 'rotating';
      }
  
      // Default to dragging if inside
      return 'dragging';
  }


  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCoords(e);
    if (!coords || !isAnnotating) return;
    setStartPoint(coords);
    
    if (annotationMode === 'pen') {
      setAction('drawing');
      setCurrentPath([coords]);
      return;
    }
    
    // Interaction with existing annotations if mode is 'select'
    if(annotationMode === 'select') {
      const selected = getAnnotationAtPoint(coords);
      setSelectedAnnotationId(selected?.id || null);

      if (selected) {
        const currentAction = getActionForPoint(coords, selected);
        setAction(currentAction);
      } else {
        setAction('none');
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (action === 'none' || !startPoint) return;
    
    const coords = getCoords(e);
    if (!coords) return;
    
    if (action === 'drawing') {
        setCurrentPath((prev) => [...prev, coords]);
        return;
    }
    
    const selectedAnnotation = annotations.find(a => a.id === selectedAnnotationId);
    if (!selectedAnnotation || (selectedAnnotation.type !== 'image')) return;
    
    let updatedData = { ...selectedAnnotation.data } as ImageAnnotationData;
    
    const dx = coords.x - startPoint.x;
    const dy = coords.y - startPoint.y;

    if (action === 'dragging') {
        updatedData.x += dx;
        updatedData.y += dy;
    } else if (action === 'resizing') {
        // Calculations in rotated coordinate system
        const sinR = Math.sin(updatedData.rotation);
        const cosR = Math.cos(updatedData.rotation);
        const rotatedDx = dx * cosR + dy * sinR;
        const rotatedDy = dy * cosR - dx * sinR;
        
        const originalWidth = updatedData.width;
        const originalHeight = updatedData.height;

        updatedData.width += rotatedDx;
        
        if (e.nativeEvent instanceof MouseEvent && e.nativeEvent.shiftKey) {
            const aspectRatio = originalWidth / originalHeight;
            updatedData.height = updatedData.width / aspectRatio;
        } else {
            updatedData.height += rotatedDy;
        }

    } else if (action === 'rotating') {
        const centerX = selectedAnnotation.data.x + selectedAnnotation.data.width / 2;
        const centerY = selectedAnnotation.data.y + selectedAnnotation.data.height / 2;
        const startAngle = Math.atan2(startPoint.y - centerY, startPoint.x - centerX);
        const currentAngle = Math.atan2(coords.y - centerY, coords.x - centerX);
        updatedData.rotation = (selectedAnnotation.data as ImageAnnotationData).rotation + (currentAngle - startAngle);
    }

    onUpdateAnnotation({ ...selectedAnnotation, data: updatedData });
    setStartPoint(coords);
  };

  const handleMouseUp = () => {
    if (action === 'drawing' && currentPath.length > 1) {
      const annotationData: PenAnnotationData = {
        path: currentPath,
        color: penColor,
        lineWidth: penLineWidth,
      };
      onAddAnnotation(annotationData, 'pen');
    }
    
    setAction('none');
    setStartPoint(null);
    setCurrentPath([]);
  };
  // #endregion

  const cursor = () => {
    if(annotationMode === 'pen') return 'crosshair';
    if(action === 'dragging') return 'grabbing';
    if(action === 'resizing') return 'nwse-resize';
    if(action === 'rotating') return 'alias';
    if(annotationMode === 'select' && selectedAnnotationId) return 'grab';
    return 'default';
  }

  const pointerEventsEnabled = isAnnotating;


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
      style={{ 
        pointerEvents: pointerEventsEnabled ? 'auto' : 'none',
        cursor: cursor()
      }}
    />
  );
};

export default AnnotationCanvas;
