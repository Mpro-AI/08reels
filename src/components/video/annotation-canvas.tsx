'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Annotation, PenAnnotationData, ImageAnnotationData, TextAnnotationData } from '@/lib/types';
import type { AnnotationMode } from '@/app/videos/[id]/page';


interface AnnotationCanvasProps {
  width: number;
  height: number;
  annotations: Annotation[];
  onAddAnnotation: (data: PenAnnotationData, type: 'pen') => void;
  onUpdateAnnotation: (annotation: Annotation) => void;
  onEnterTextMode: (canvasCoords: { x: number, y: number }, screenCoords: { x: number, y: number }) => void;
  annotationMode: AnnotationMode;
  penColor: string;
  penLineWidth: number;
  isAnnotating: boolean;
}

type Action = 'drawing' | 'dragging' | 'resizing' | 'rotating' | 'none';

// Constants for control handles
const HANDLE_SIZE = 16; // 增大按鈕尺寸
const HANDLE_HIT_SIZE = 24; // 點擊區域比視覺更大，更容易點擊
const ROTATION_HANDLE_OFFSET = 30;

const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  width,
  height,
  annotations,
  onAddAnnotation,
  onUpdateAnnotation,
  onEnterTextMode,
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

    // Canvas 座標 (用於繪製)
    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;

    // 屏幕座標 (相對於 Canvas 元素,用於 UI 定位)
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    return {
      canvas: { x: canvasX, y: canvasY },
      screen: { x: screenX, y: screenY }
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
  
  const drawTextAnnotation = (ctx: CanvasRenderingContext2D, data: TextAnnotationData, isSelected: boolean) => {
    ctx.save();
    ctx.translate(data.x + data.width / 2, data.y + data.height / 2);
    ctx.rotate(data.rotation);

    // 繪製背景 (如果有設定)
    if (data.backgroundColor) {
      const padding = 4;
      ctx.fillStyle = data.backgroundColor;
      ctx.fillRect(
        -data.width / 2 - padding,
        -data.height / 2 - padding,
        data.width + padding * 2,
        data.height + padding * 2
      );
    }

    // 計算原始文字尺寸
    ctx.font = `${data.fontSize}px sans-serif`;
    const metrics = ctx.measureText(data.text);
    const originalWidth = metrics.width;
    const originalHeight = data.fontSize * 1.2;

    // 計算縮放比例，讓文字填滿邊界框
    const scaleX = data.width / originalWidth;
    const scaleY = data.height / originalHeight;

    // 應用縮放
    ctx.scale(scaleX, scaleY);

    ctx.fillStyle = data.color;
    ctx.textBaseline = 'middle';
    ctx.fillText(data.text, -originalWidth / 2, 0);

    ctx.restore();

    if (isSelected) {
        drawSelectionHandles(ctx, { ...data, url: '' });
    }
  };

  const drawSelectionHandles = (ctx: CanvasRenderingContext2D, data: ImageAnnotationData | TextAnnotationData) => {
      ctx.save();
      ctx.translate(data.x + data.width / 2, data.y + data.height / 2);
      ctx.rotate(data.rotation);

      // Draw bounding box
      ctx.strokeStyle = '#09f';
      ctx.lineWidth = 2 / (width / 1920); // 稍微加粗邊框
      ctx.strokeRect(-data.width / 2, -data.height / 2, data.width, data.height);

      const scaledHandleSize = HANDLE_SIZE / (width/1920);
      const halfHandle = scaledHandleSize / 2;
      const halfWidth = data.width / 2;
      const halfHeight = data.height / 2;

      // 繪製四個角落的縮放把手
      ctx.fillStyle = '#09f';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2 / (width / 1920);

      // 右下角 (主要縮放把手)
      ctx.fillRect(halfWidth - halfHandle, halfHeight - halfHandle, scaledHandleSize, scaledHandleSize);
      ctx.strokeRect(halfWidth - halfHandle, halfHeight - halfHandle, scaledHandleSize, scaledHandleSize);

      // 左下角
      ctx.fillRect(-halfWidth - halfHandle, halfHeight - halfHandle, scaledHandleSize, scaledHandleSize);
      ctx.strokeRect(-halfWidth - halfHandle, halfHeight - halfHandle, scaledHandleSize, scaledHandleSize);

      // 右上角
      ctx.fillRect(halfWidth - halfHandle, -halfHeight - halfHandle, scaledHandleSize, scaledHandleSize);
      ctx.strokeRect(halfWidth - halfHandle, -halfHeight - halfHandle, scaledHandleSize, scaledHandleSize);

      // 左上角
      ctx.fillRect(-halfWidth - halfHandle, -halfHeight - halfHandle, scaledHandleSize, scaledHandleSize);
      ctx.strokeRect(-halfWidth - halfHandle, -halfHeight - halfHandle, scaledHandleSize, scaledHandleSize);

      // Draw rotation handle (top-center)
      const scaledRotationOffset = ROTATION_HANDLE_OFFSET / (width/1920);
      ctx.beginPath();
      ctx.moveTo(0, -halfHeight);
      ctx.lineTo(0, -halfHeight - scaledRotationOffset);
      ctx.strokeStyle = '#09f';
      ctx.lineWidth = 2 / (width / 1920);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -halfHeight - scaledRotationOffset, scaledHandleSize / 2 + 2 / (width/1920), 0, 2 * Math.PI);
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
      } else if (annotation.type === 'text') {
        drawTextAnnotation(ctx, annotation.data as TextAnnotationData, isSelected);
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
        if (annotation.type === 'image' || annotation.type === 'text') {
            const data = annotation.data as ImageAnnotationData | TextAnnotationData;
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
      if (annotation.type !== 'image' && annotation.type !== 'text') return 'none';

      const data = annotation.data as ImageAnnotationData | TextAnnotationData;
      const centerX = data.x + data.width / 2;
      const centerY = data.y + data.height / 2;

      // Transform point to annotation's local coordinate system
      const translatedX = point.x - centerX;
      const translatedY = point.y - centerY;
      const rotatedX = translatedX * Math.cos(-data.rotation) - translatedY * Math.sin(-data.rotation);
      const rotatedY = translatedX * Math.sin(-data.rotation) + translatedY * Math.cos(-data.rotation);

      // 使用較大的點擊區域，更容易點擊
      const scaledHitSize = HANDLE_HIT_SIZE / (width/1920);
      const scaledRotationOffset = ROTATION_HANDLE_OFFSET / (width/1920);
      const halfWidth = data.width / 2;
      const halfHeight = data.height / 2;

      // Check all 4 corner resize handles
      const corners = [
        { x: halfWidth, y: halfHeight },     // 右下
        { x: -halfWidth, y: halfHeight },    // 左下
        { x: halfWidth, y: -halfHeight },    // 右上
        { x: -halfWidth, y: -halfHeight },   // 左上
      ];

      for (const corner of corners) {
        if (Math.abs(rotatedX - corner.x) < scaledHitSize && Math.abs(rotatedY - corner.y) < scaledHitSize) {
          return 'resizing';
        }
      }

      // Check rotation handle (top-center)
      const rotationHandleX = 0;
      const rotationHandleY = -halfHeight - scaledRotationOffset;
      if (Math.sqrt((rotatedX - rotationHandleX)**2 + (rotatedY - rotationHandleY)**2) < scaledHitSize) {
          return 'rotating';
      }

      // Default to dragging if inside
      return 'dragging';
  }


  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCoords(e);
    if (!coords || !isAnnotating) return;
    setStartPoint(coords.canvas);

    // Check if we are in a mode to add a new annotation
    if (annotationMode === 'pen') {
      setAction('drawing');
      setCurrentPath([coords.canvas]);
      return;
    }

    if (annotationMode === 'text') {
      onEnterTextMode(coords.canvas, coords.screen);
      return;
    }

    // If not in an "add" mode, check for interaction with existing annotations
    const selected = getAnnotationAtPoint(coords.canvas);
    setSelectedAnnotationId(selected?.id || null);

    if (selected) {
      const currentAction = getActionForPoint(coords.canvas, selected);
      setAction(currentAction);
    } else {
      setAction('none');
    }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (action === 'none' || !startPoint) return;

    const coords = getCoords(e);
    if (!coords) return;

    if (action === 'drawing') {
        setCurrentPath((prev) => [...prev, coords.canvas]);
        return;
    }

    const selectedAnnotation = annotations.find(a => a.id === selectedAnnotationId);
    if (!selectedAnnotation || (selectedAnnotation.type !== 'image' && selectedAnnotation.type !== 'text')) return;

    let updatedData = { ...selectedAnnotation.data } as ImageAnnotationData | TextAnnotationData;

    const dx = coords.canvas.x - startPoint.x;
    const dy = coords.canvas.y - startPoint.y;

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

        updatedData.width += rotatedDx;
        
        if (selectedAnnotation.type === 'image') {
          if ((e.nativeEvent as MouseEvent)?.shiftKey) {
              const aspectRatio = originalWidth / (updatedData as ImageAnnotationData).height;
              (updatedData as ImageAnnotationData).height = updatedData.width / aspectRatio;
          } else {
              (updatedData as ImageAnnotationData).height += rotatedDy;
          }
        } else if (selectedAnnotation.type === 'text') {
            // 文字可以自由縮放寬高，fontSize 保持不變
            // 渲染時會用 scale 來拉伸文字填滿邊界框
            (updatedData as TextAnnotationData).height += rotatedDy;
        }

    } else if (action === 'rotating') {
        const centerX = updatedData.x + updatedData.width / 2;
        const centerY = updatedData.y + updatedData.height / 2;
        const startAngle = Math.atan2(startPoint.y - centerY, startPoint.x - centerX);
        const currentAngle = Math.atan2(coords.canvas.y - centerY, coords.canvas.x - centerX);
        updatedData.rotation += (currentAngle - startAngle);
    }

    onUpdateAnnotation({ ...selectedAnnotation, data: updatedData });
    setStartPoint(coords.canvas);
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
    if(annotationMode === 'text') return 'text';
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
      className="absolute top-0 left-0 w-full h-full"
      style={{ 
        pointerEvents: pointerEventsEnabled ? 'auto' : 'none',
        cursor: cursor(),
      }}
    />
  );
};

export default AnnotationCanvas;
