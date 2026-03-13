import { useState, useCallback } from 'react';
import type { Annotation } from '@/lib/types';
import type { AnnotationAction } from './types';

const MAX_HISTORY = 30;

export interface UseAnnotationHistoryReturn {
  readonly annotations: readonly Annotation[];
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly add: (annotation: Annotation) => void;
  readonly remove: (annotationId: string) => void;
  readonly update: (annotationId: string, updated: Annotation) => void;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly clearHistory: () => void;
  readonly setAnnotations: (annotations: Annotation[]) => void;
}

export function useAnnotationHistory(
  initialAnnotations: Annotation[] = [],
): UseAnnotationHistoryReturn {
  const [annotations, setAnnotationsState] = useState<Annotation[]>(initialAnnotations);
  const [past, setPast] = useState<AnnotationAction[]>([]);
  const [future, setFuture] = useState<AnnotationAction[]>([]);

  const pushAction = useCallback((action: AnnotationAction) => {
    setPast(prev => {
      const next = [...prev, action];
      return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
    });
    setFuture([]);
  }, []);

  const add = useCallback((annotation: Annotation) => {
    setAnnotationsState(prev => [...prev, annotation]);
    pushAction({ type: 'add', annotation });
  }, [pushAction]);

  const remove = useCallback((annotationId: string) => {
    setAnnotationsState(prev => {
      const found = prev.find(a => a.id === annotationId);
      if (!found) return prev;
      // pushAction called here is batched by React 18 with the setAnnotationsState
      pushAction({ type: 'delete', annotationId, annotation: found });
      return prev.filter(a => a.id !== annotationId);
    });
  }, [pushAction]);

  const update = useCallback((annotationId: string, updated: Annotation) => {
    setAnnotationsState(prev => {
      const before = prev.find(a => a.id === annotationId);
      if (!before) return prev;
      // pushAction called here is batched by React 18 with the setAnnotationsState
      pushAction({ type: 'update', annotationId, before, after: updated });
      return prev.map(a => a.id === annotationId ? updated : a);
    });
  }, [pushAction]);

  const undo = useCallback(() => {
    setPast(prevPast => {
      if (prevPast.length === 0) return prevPast;

      const action = prevPast[prevPast.length - 1];
      const remaining = prevPast.slice(0, -1);

      setFuture(prevFuture => [...prevFuture, action]);

      setAnnotationsState(prev => {
        switch (action.type) {
          case 'add':
            return prev.filter(a => a.id !== action.annotation.id);
          case 'delete':
            return [...prev, action.annotation];
          case 'update':
            return prev.map(a => a.id === action.annotationId ? action.before : a);
          default:
            return prev;
        }
      });

      return remaining;
    });
  }, []);

  const redo = useCallback(() => {
    setFuture(prevFuture => {
      if (prevFuture.length === 0) return prevFuture;

      const action = prevFuture[prevFuture.length - 1];
      const remaining = prevFuture.slice(0, -1);

      setPast(prevPast => [...prevPast, action]);

      setAnnotationsState(prev => {
        switch (action.type) {
          case 'add':
            return [...prev, action.annotation];
          case 'delete':
            return prev.filter(a => a.id !== action.annotationId);
          case 'update':
            return prev.map(a => a.id === action.annotationId ? action.after : a);
          default:
            return prev;
        }
      });

      return remaining;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setPast([]);
    setFuture([]);
  }, []);

  const setAnnotations = useCallback((newAnnotations: Annotation[]) => {
    setAnnotationsState(newAnnotations);
    setPast([]);
    setFuture([]);
  }, []);

  return {
    annotations,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    add,
    remove,
    update,
    undo,
    redo,
    clearHistory,
    setAnnotations,
  };
}
