'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Annotation, PenAnnotationData, ImageAnnotationData, TextAnnotationData } from '@/lib/types';
import type { AnnotationMode, Point, CanvasScale } from './types';
import { useAnnotationHistory } from './use-annotation-history';
import { screenToCanvas, calculateActualFontSize, NEW_ANNOTATION_PREFIX, isNewAnnotation } from './utils';
import { addAnnotationsToVersion, updateAnnotationInVersion, deleteAnnotationFromVersion } from '@/firebase/db/videos';
import { uploadAnnotationImage } from '@/firebase/storage';

interface UseAnnotationsProps {
  readonly videoId: string;
  readonly versionId: string;
  readonly existingAnnotations: Annotation[];
  readonly currentTime: number;
  readonly canvasScale: CanvasScale;
  readonly canvasHeight: number;
  readonly user: { id: string; name: string } | null;
  readonly isAdmin: boolean;
  readonly onToast: (opts: { title: string; description?: string; variant?: 'default' | 'destructive' }) => void;
  readonly onSelectAnnotation?: (id: string | null) => void;
}

export function useAnnotations({
  videoId,
  versionId,
  existingAnnotations,
  currentTime,
  canvasScale,
  canvasHeight,
  user,
  isAdmin,
  onToast,
  onSelectAnnotation,
}: UseAnnotationsProps) {
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [annotationMode, setAnnotationMode] = useState<AnnotationMode>('select');
  const [penColor, setPenColor] = useState('#FF0000');
  const [penLineWidth, setPenLineWidth] = useState(3);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editingTextPosition, setEditingTextPosition] = useState<Point | null>(null);
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [deletedSavedIds, setDeletedSavedIds] = useState<Set<string>>(new Set());
  const [modifiedAnnotations, setModifiedAnnotations] = useState<Map<string, Annotation>>(new Map());
  const imageInputRef = useRef<HTMLInputElement>(null);

  const history = useAnnotationHistory();

  // Merge existing + new, filter deleted
  const allAnnotations = useMemo(() => {
    const existing = existingAnnotations
      .filter(a => !deletedSavedIds.has(a.id))
      .map(a => modifiedAnnotations.get(a.id) || a);
    return [...existing, ...history.annotations];
  }, [existingAnnotations, history.annotations, deletedSavedIds, modifiedAnnotations]);

  // Visibility: annotation mode = always show at timecode, viewing = 1s window
  const visibleAnnotations = useMemo(() => {
    const quantizedTime = Math.floor(currentTime * 4) / 4; // quantize to 250ms
    return allAnnotations.filter(a => {
      if (isAnnotating) {
        return a.timecode === Math.floor(quantizedTime);
      }
      return quantizedTime >= a.timecode && quantizedTime < a.timecode + 1;
    });
  }, [allAnnotations, currentTime, isAnnotating]);

  const hasUnsavedChanges = history.annotations.length > 0 || deletedSavedIds.size > 0 || modifiedAnnotations.size > 0;

  // --- Actions ---

  const enterAnnotationMode = useCallback((mode: AnnotationMode) => {
    if (!isAdmin) return;
    setIsAnnotating(true);
    setAnnotationMode(mode);
    if (mode === 'image') {
      imageInputRef.current?.click();
    }
  }, [isAdmin]);

  const addPenAnnotation = useCallback((data: PenAnnotationData) => {
    if (!user) return;
    const annotation: Annotation = {
      id: `${NEW_ANNOTATION_PREFIX}${uuidv4()}`,
      type: 'pen',
      data,
      author: { id: user.id, name: user.name },
      createdAt: new Date().toISOString(),
      timecode: Math.floor(currentTime),
    };
    history.add(annotation);
  }, [user, currentTime, history]);

  const addTextAnnotation = useCallback((text: string, canvasPosition: Point, fontSize: number, color: string, backgroundColor?: string) => {
    if (!user) return;

    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    const actualFontSize = calculateActualFontSize(fontSize, canvasHeight);
    ctx.font = `500 ${actualFontSize}px sans-serif`;
    const metrics = ctx.measureText(text);
    const textHeight = actualFontSize * 1.2;

    const textData: TextAnnotationData = {
      text,
      x: canvasPosition.x - metrics.width / 2,
      y: canvasPosition.y - textHeight / 2,
      width: metrics.width,
      height: textHeight,
      fontSize,
      color,
      backgroundColor,
      rotation: 0,
    };

    const annotation: Annotation = {
      id: `${NEW_ANNOTATION_PREFIX}${uuidv4()}`,
      type: 'text',
      data: textData,
      author: { id: user.id, name: user.name },
      createdAt: new Date().toISOString(),
      timecode: Math.floor(currentTime),
    };

    history.add(annotation);
    setIsEditingText(false);
    setEditingTextPosition(null);
    setAnnotationMode('select');
    onToast({ title: '文字註解已新增' });
  }, [user, currentTime, canvasHeight, history, onToast]);

  const handleImageUpload = useCallback(async (file: File, screenPosition?: Point) => {
    if (!user) return;
    setIsUploading(true);
    setAnnotationMode('select');

    try {
      const imageUrl = await uploadAnnotationImage(file, videoId, versionId);

      const tempImg = new Image();
      tempImg.src = URL.createObjectURL(file);
      await new Promise(resolve => { tempImg.onload = resolve; });
      const aspectRatio = tempImg.width / tempImg.height;
      URL.revokeObjectURL(tempImg.src);

      const imageWidth = canvasScale.canvasWidth * 0.2;
      const imageHeight = imageWidth / aspectRatio;

      let x: number, y: number;
      if (screenPosition) {
        const canvasPos = screenToCanvas(screenPosition, canvasScale);
        x = canvasPos.x - imageWidth / 2;
        y = canvasPos.y - imageHeight / 2;
      } else {
        x = (canvasScale.canvasWidth - imageWidth) / 2;
        y = (canvasScale.canvasHeight - imageHeight) / 2;
      }

      const imageData: ImageAnnotationData = {
        url: imageUrl,
        x, y,
        width: imageWidth,
        height: imageHeight,
        rotation: 0,
      };

      const annotation: Annotation = {
        id: `${NEW_ANNOTATION_PREFIX}${uuidv4()}`,
        type: 'image',
        data: imageData,
        author: { id: user.id, name: user.name },
        createdAt: new Date().toISOString(),
        timecode: Math.floor(currentTime),
      };

      history.add(annotation);
      onSelectAnnotation?.(annotation.id);
      onToast({ title: '圖片已新增', description: '可以拖曳、縮放或旋轉圖片。' });
    } catch (error) {
      onToast({ variant: 'destructive', title: '圖片上傳失敗' });
    } finally {
      setIsUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  }, [user, videoId, versionId, canvasScale, currentTime, history, onToast, onSelectAnnotation]);

  const handleImageFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      if (imageInputRef.current) imageInputRef.current.value = '';
      return;
    }
    await handleImageUpload(file);
  }, [handleImageUpload]);

  const updateAnnotation = useCallback((updated: Annotation) => {
    if (isNewAnnotation(updated.id)) {
      history.update(updated.id, updated);
    } else {
      setModifiedAnnotations(prev => new Map(prev).set(updated.id, updated));
    }
  }, [history]);

  const deleteAnnotation = useCallback((id: string) => {
    if (isNewAnnotation(id)) {
      history.remove(id);
    } else {
      setDeletedSavedIds(prev => new Set(prev).add(id));
    }
    onSelectAnnotation?.(null);
  }, [history, onSelectAnnotation]);

  const enterTextMode = useCallback((canvasPosition: Point) => {
    setIsEditingText(true);
    setEditingTextPosition(canvasPosition);
    setEditingAnnotationId(null);
  }, []);

  const editExistingText = useCallback((annotation: Annotation) => {
    if (annotation.type !== 'text') return;
    const data = annotation.data as TextAnnotationData;
    setIsEditingText(true);
    setEditingTextPosition({ x: data.x + data.width / 2, y: data.y + data.height / 2 });
    setEditingAnnotationId(annotation.id);
  }, []);

  const cancelTextEdit = useCallback(() => {
    setIsEditingText(false);
    setEditingTextPosition(null);
    setEditingAnnotationId(null);
  }, []);

  // --- Save ---

  const cleanAnnotationData = (annotation: Annotation): Annotation => {
    const cleaned = structuredClone(annotation);
    // Remove undefined values by converting to null then cleaning
    const data = cleaned.data as Record<string, unknown>;
    for (const key of Object.keys(data)) {
      if (data[key] === undefined) {
        delete data[key];
      }
    }
    return cleaned;
  };

  const save = useCallback(async () => {
    if (!user || !hasUnsavedChanges) return;

    try {
      const promises: Promise<unknown>[] = [];

      // Save new annotations
      if (history.annotations.length > 0) {
        const toAdd = history.annotations.map(ann => {
          const cleaned = cleanAnnotationData(ann as Annotation);
          const { id: _id, ...rest } = cleaned;
          return rest;
        });
        promises.push(addAnnotationsToVersion(videoId, versionId, toAdd as Omit<Annotation, 'id'>[]));
      }

      // Update modified annotations (batch)
      for (const [, annotation] of modifiedAnnotations) {
        const cleaned = cleanAnnotationData(annotation);
        promises.push(updateAnnotationInVersion(videoId, versionId, cleaned));
      }

      // Delete saved annotations (batch)
      for (const id of deletedSavedIds) {
        promises.push(deleteAnnotationFromVersion(videoId, versionId, id));
      }

      await Promise.all(promises);

      const totalCount = history.annotations.length + modifiedAnnotations.size + deletedSavedIds.size;

      history.setAnnotations([]);
      setDeletedSavedIds(new Set());
      setModifiedAnnotations(new Map());
      setIsAnnotating(false);
      setAnnotationMode('select');

      onToast({ title: `已儲存 ${totalCount} 個註解` });
    } catch (error) {
      onToast({ variant: 'destructive', title: '儲存失敗', description: '無法儲存註解，請稍後再試。' });
      throw error;
    }
  }, [user, hasUnsavedChanges, history, modifiedAnnotations, deletedSavedIds, videoId, versionId, onToast]);

  // --- Exit ---

  const exit = useCallback(() => {
    history.setAnnotations([]);
    setDeletedSavedIds(new Set());
    setModifiedAnnotations(new Map());
    setIsAnnotating(false);
    setAnnotationMode('select');
    setIsUploading(false);
    setIsEditingText(false);
    setEditingTextPosition(null);
    onSelectAnnotation?.(null);
  }, [history, onSelectAnnotation]);

  return {
    // State
    isAnnotating,
    annotationMode,
    penColor,
    penLineWidth,
    isUploading,
    isEditingText,
    editingTextPosition,
    editingAnnotationId,
    visibleAnnotations,
    hasUnsavedChanges,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    imageInputRef,

    // Mode
    setAnnotationMode,
    setPenColor,
    setPenLineWidth,
    enterAnnotationMode,

    // Actions
    addPenAnnotation,
    addTextAnnotation,
    handleImageUpload,
    handleImageFileChange,
    updateAnnotation,
    deleteAnnotation,
    enterTextMode,
    editExistingText,
    cancelTextEdit,

    // History
    undo: history.undo,
    redo: history.redo,

    // Lifecycle
    save,
    exit,
  };
}
