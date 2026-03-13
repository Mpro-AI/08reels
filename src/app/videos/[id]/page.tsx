'use client';
import { useParams } from 'next/navigation';
import { useState, useRef, useEffect, useCallback, useMemo, useContext } from 'react';
import Header from '@/components/header';
import VideoPlayer from '@/components/video/player';
import SidePanel from '@/components/video/side-panel';
import type { Video, VersionStatus } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useSupabase } from '@/supabase';
import { setVersionStatus, deleteCommentFromVersion } from '@/supabase/db/videos';
import { Skeleton } from '@/components/ui/skeleton';
import { AppLayoutContext } from '@/components/app-layout';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  AnnotationCanvas,
  AnnotationToolbar,
  FloatingToolbar,
  InlineTextEditor,
  useAnnotations,
  useAnnotationInteraction,
  useDropZone,
  useAnnotationKeyboard,
  formatTime,
} from '@/components/video/annotations';
import type { AnnotationMode, CanvasScale } from '@/components/video/annotations/types';
import type { TextAnnotationData, Annotation } from '@/lib/types';

export default function VideoPage() {
  const params = useParams();
  const videoId = params.id as string;
  const supabase = useSupabase();
  const { user } = useAuth();
  const { videos: allVideos, loading: videosLoading } = useContext(AppLayoutContext);

  const videoRef = useMemo(() => {
    if (!videoId) return null;
    return { table: 'videos', id: videoId };
  }, [videoId]);

  const { data: video, loading } = useDoc<Video>(videoRef);

  const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>();
  const playerRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const { toast } = useToast();
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [showExitDialog, setShowExitDialog] = useState(false);

  const [videoNaturalSize, setVideoNaturalSize] = useState<{ width: number; height: number }>({
    width: 1920,
    height: 1080,
  });

  // Track container size via ResizeObserver for responsive canvasScale
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const container = videoContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setContainerSize(prev => {
        if (prev && prev.width === width && prev.height === height) return prev;
        return { width, height };
      });
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const [preloadedUrls, setPreloadedUrls] = useState<Set<string>>(new Set());

  const selectedVersion = video?.versions.find(v => v.id === selectedVersionId);
  const currentThumbnail = selectedVersion?.thumbnailUrl || video?.thumbnailUrl;
  const isAdmin = user?.role === 'admin';

  // Canvas scale calculation
  const canvasScale: CanvasScale = useMemo(() => {
    const displayWidth = containerSize?.width || videoNaturalSize.width;
    const displayHeight = containerSize?.height || videoNaturalSize.height;
    return {
      scaleX: videoNaturalSize.width / displayWidth,
      scaleY: videoNaturalSize.height / displayHeight,
      displayWidth,
      displayHeight,
      canvasWidth: videoNaturalSize.width,
      canvasHeight: videoNaturalSize.height,
    };
  }, [videoNaturalSize, containerSize]);

  // --- Annotation system ---

  // Interaction ref for selection callback wiring
  const interactionRef = useRef<{ setSelectedAnnotationId: (id: string | null) => void } | null>(null);

  const handleAnnotationSelect = useCallback((id: string | null) => {
    interactionRef.current?.setSelectedAnnotationId(id);
  }, []);

  const annotations = useAnnotations({
    supabase,
    videoId,
    versionId: selectedVersionId || '',
    existingAnnotations: selectedVersion?.annotations || [],
    currentTime,
    canvasScale,
    canvasHeight: videoNaturalSize.height,
    user: user ? { id: user.id, name: user.name } : null,
    isAdmin: isAdmin ?? false,
    onToast: toast,
    onSelectAnnotation: handleAnnotationSelect,
  });

  const interaction = useAnnotationInteraction({
    annotations: annotations.visibleAnnotations,
    annotationMode: annotations.annotationMode,
    penColor: annotations.penColor,
    penLineWidth: annotations.penLineWidth,
    isAnnotating: annotations.isAnnotating && !annotations.isEditingText,
    canvasScale,
    onAddPen: annotations.addPenAnnotation,
    onUpdateAnnotation: annotations.updateAnnotation,
    onEnterTextMode: annotations.enterTextMode,
    onSelectAnnotation: () => {}, // interaction manages its own selection state
    onDoubleClickText: annotations.editExistingText,
  });

  // Wire up the ref after interaction is created
  interactionRef.current = interaction;

  const dropZone = useDropZone({
    onDrop: (file, screenPos) => annotations.handleImageUpload(file, screenPos),
    enabled: annotations.isAnnotating,
  });

  useAnnotationKeyboard({
    onUndo: annotations.undo,
    onRedo: annotations.redo,
    onDelete: () => {
      if (interaction.selectedAnnotationId) {
        annotations.deleteAnnotation(interaction.selectedAnnotationId);
        interaction.deselect();
      }
    },
    onEscape: () => {
      if (annotations.isEditingText) {
        annotations.cancelTextEdit();
      } else if (interaction.selectedAnnotationId) {
        interaction.deselect();
      }
    },
    enabled: annotations.isAnnotating,
    canUndo: annotations.canUndo,
    canRedo: annotations.canRedo,
    hasSelection: !!interaction.selectedAnnotationId,
  });

  // --- Version selection ---
  useEffect(() => {
    if (video && !selectedVersionId) {
      const currentActiveVersion = video.versions.find(v => v.isCurrentActive);
      if (currentActiveVersion) {
        setSelectedVersionId(currentActiveVersion.id);
      } else if (video.versions.length > 0) {
        const latestVersion = video.versions.sort((a, b) => b.versionNumber - a.versionNumber)[0];
        setSelectedVersionId(latestVersion.id);
      }
    }
  }, [video, selectedVersionId]);

  // --- Video metadata ---
  useEffect(() => {
    const videoEl = playerRef.current;
    if (!videoEl) return;

    const handleLoadedMetadata = () => {
      setVideoNaturalSize({ width: videoEl.videoWidth, height: videoEl.videoHeight });
    };

    videoEl.addEventListener('loadedmetadata', handleLoadedMetadata);
    if (videoEl.videoWidth > 0) handleLoadedMetadata();
    return () => videoEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [selectedVersion?.videoUrl]);

  // --- Preloading ---
  useEffect(() => {
    if (!allVideos || allVideos.length < 2 || !videoId) return;
    const idx = allVideos.findIndex(v => v.id === videoId);
    if (idx !== -1 && idx < allVideos.length - 1) {
      const nextVideo = allVideos[idx + 1];
      const nextVersion = nextVideo.versions.find(v => v.isCurrentActive) || nextVideo.versions.sort((a, b) => b.versionNumber - a.versionNumber)[0];
      if (nextVersion) {
        const nextUrl = nextVersion.videoUrl;
        if (!preloadedUrls.has(nextUrl)) {
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.href = nextUrl;
          link.as = 'video';
          document.head.appendChild(link);
          setPreloadedUrls(prev => new Set(prev).add(nextUrl));
        }
      }
    }
  }, [allVideos, videoId, preloadedUrls]);

  // --- Time tracking ---
  useEffect(() => {
    const videoEl = playerRef.current;
    if (!videoEl) return;
    const onTimeUpdate = () => setCurrentTime(videoEl.currentTime);
    videoEl.addEventListener('timeupdate', onTimeUpdate);
    return () => videoEl.removeEventListener('timeupdate', onTimeUpdate);
  }, [playerRef, selectedVersion]);

  // --- Space bar play/pause ---
  const togglePlayPause = useCallback(() => {
    if (!playerRef.current) return;
    if (playerRef.current.paused) {
      playerRef.current.play();
    } else {
      playerRef.current.pause();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        event.preventDefault();
        togglePlayPause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayPause]);

  // --- Side panel handlers ---
  const handleAnnotationClick = useCallback((timecode: number, mode: AnnotationMode) => {
    if (!isAdmin) return;
    if (playerRef.current) {
      playerRef.current.currentTime = timecode;
      playerRef.current.pause();
    }
    annotations.enterAnnotationMode(mode);
  }, [isAdmin, annotations]);

  const handleTimecodeClick = useCallback((timecode: number) => {
    if (playerRef.current) playerRef.current.currentTime = timecode;
  }, []);

  const handleVersionStatusChange = useCallback((versionId: string, status: VersionStatus) => {
    if (!video || !user) return;
    if (user.role !== 'admin' && user.id !== video.author.id) {
      toast({ variant: 'destructive', title: '權限不足', description: '只有管理員或專案作者才能變更版本狀態。' });
      return;
    }
    setVersionStatus(supabase, video.id, versionId, status);
    toast({ title: '版本狀態已更新' });
  }, [supabase, video, user, toast]);

  const handleDeleteComment = useCallback((commentId: string) => {
    if (!video || !user || !selectedVersionId) return;
    deleteCommentFromVersion(supabase, video.id, selectedVersionId, commentId);
    toast({ variant: 'default', title: '評論已刪除' });
  }, [supabase, video, user, selectedVersionId, toast]);

  // --- Enter annotation mode (pause video) ---
  const handleEnterAnnotation = useCallback((mode: AnnotationMode) => {
    if (playerRef.current) playerRef.current.pause();
    annotations.enterAnnotationMode(mode);
  }, [annotations]);

  // --- Exit with confirmation ---
  const handleExitRequest = useCallback(() => {
    if (annotations.hasUnsavedChanges) {
      setShowExitDialog(true);
    } else {
      annotations.exit();
    }
  }, [annotations]);

  // --- Floating toolbar annotation update helper ---
  const updateSelectedTextProp = useCallback((ann: Annotation, prop: Partial<TextAnnotationData>) => {
    const data = { ...ann.data } as TextAnnotationData;
    annotations.updateAnnotation({ ...ann, data: { ...data, ...prop } });
  }, [annotations]);

  // --- Loading state ---
  if (loading || !video || !selectedVersion || videosLoading) {
    return (
      <>
        <Header title="載入中..." />
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 overflow-hidden">
          <div className="lg:col-span-2 xl:col-span-3 bg-background p-4 h-full max-h-full flex items-center justify-center relative">
            <Skeleton className="w-full aspect-video" />
          </div>
          <div className="lg:col-span-1 xl:col-span-1 h-full overflow-y-auto">
            <div className="p-4 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </main>
      </>
    );
  }

  // Find selected annotation for floating toolbar
  const selectedAnnotation = interaction.selectedAnnotationId
    ? annotations.visibleAnnotations.find(a => a.id === interaction.selectedAnnotationId) || null
    : null;

  return (
    <>
      <Header title={video.title} />
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 overflow-hidden">
        <div className="lg:col-span-2 xl:col-span-3 bg-background p-4 h-full max-h-full flex items-center justify-center">
          <div
            ref={videoContainerRef}
            className="relative w-full max-w-5xl mx-auto"
            onDragOver={dropZone.handleDragOver}
            onDragLeave={dropZone.handleDragLeave}
            onDrop={dropZone.handleDrop}
          >
            <VideoPlayer
              src={selectedVersion.videoUrl}
              poster={currentThumbnail}
              videoRef={playerRef}
              isPaused={annotations.isAnnotating}
              qualities={selectedVersion.qualities}
            />

            {/* Drop zone overlay */}
            {dropZone.isDragging && (
              <div className="absolute inset-0 z-50 bg-blue-500/20 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-blue-700 font-medium text-lg bg-white/80 px-4 py-2 rounded">
                  放開以新增圖片
                </span>
              </div>
            )}

            {/* Annotation mode banner */}
            {annotations.isAnnotating && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2">
                <span>註解模式已啟用（影片已暫停）</span>
                <button
                  onClick={handleExitRequest}
                  className="bg-white text-orange-500 px-3 py-1 rounded hover:bg-gray-100 font-bold"
                >
                  退出
                </button>
              </div>
            )}

            {/* Main toolbar */}
            {isAdmin && annotations.isAnnotating && (
              <div className="absolute top-4 z-20 flex w-full justify-center">
                <AnnotationToolbar
                  mode={annotations.annotationMode}
                  onModeChange={(mode) => {
                    annotations.setAnnotationMode(mode);
                    if (mode === 'image') {
                      annotations.imageInputRef.current?.click();
                    }
                  }}
                  color={annotations.penColor}
                  onColorChange={annotations.setPenColor}
                  lineWidth={annotations.penLineWidth}
                  onLineWidthChange={annotations.setPenLineWidth}
                  onSave={annotations.save}
                  onExit={handleExitRequest}
                  isSavingDisabled={!annotations.hasUnsavedChanges}
                  isUploading={annotations.isUploading}
                  canUndo={annotations.canUndo}
                  canRedo={annotations.canRedo}
                  onUndo={annotations.undo}
                  onRedo={annotations.redo}
                  hasUnsavedChanges={annotations.hasUnsavedChanges}
                />
              </div>
            )}

            {/* Floating context toolbar */}
            {selectedAnnotation && annotations.isAnnotating && !annotations.isEditingText && (
              <FloatingToolbar
                annotation={selectedAnnotation}
                canvasScale={canvasScale}
                onFontSizeChange={(size) => updateSelectedTextProp(selectedAnnotation, { fontSize: size })}
                onColorChange={(color) => updateSelectedTextProp(selectedAnnotation, { color })}
                onBackgroundColorChange={(bg) => updateSelectedTextProp(selectedAnnotation, { backgroundColor: bg || undefined })}
                onDelete={() => {
                  annotations.deleteAnnotation(selectedAnnotation.id);
                  interaction.deselect();
                }}
              />
            )}

            {/* Inline text editor */}
            {annotations.isEditingText && annotations.editingTextPosition && (
              <InlineTextEditor
                canvasPosition={annotations.editingTextPosition}
                scale={canvasScale}
                fontSize={32}
                color={annotations.penColor}
                initialText={
                  annotations.editingAnnotationId
                    ? ((annotations.visibleAnnotations.find(a => a.id === annotations.editingAnnotationId)?.data as TextAnnotationData | undefined)?.text ?? '')
                    : ''
                }
                onComplete={(text) => {
                  if (annotations.editingAnnotationId) {
                    const existing = annotations.visibleAnnotations.find(a => a.id === annotations.editingAnnotationId);
                    if (existing) {
                      const data = { ...existing.data } as TextAnnotationData;
                      annotations.updateAnnotation({ ...existing, data: { ...data, text } });
                    }
                    annotations.cancelTextEdit();
                  } else if (annotations.editingTextPosition) {
                    annotations.addTextAnnotation(
                      text,
                      annotations.editingTextPosition,
                      32,
                      annotations.penColor,
                    );
                  }
                }}
                onCancel={annotations.cancelTextEdit}
              />
            )}

            {/* Canvas */}
            <AnnotationCanvas
              width={videoNaturalSize.width}
              height={videoNaturalSize.height}
              annotations={annotations.visibleAnnotations}
              selectedAnnotationId={interaction.selectedAnnotationId}
              annotationMode={annotations.annotationMode}
              penColor={annotations.penColor}
              penLineWidth={annotations.penLineWidth}
              isAnnotating={annotations.isAnnotating && !annotations.isEditingText}
              currentPath={interaction.currentPath}
              pathTick={interaction.pathTick}
              onMouseDown={interaction.handleMouseDown}
              onMouseMove={interaction.handleMouseMove}
              onMouseUp={interaction.handleMouseUp}
              onDoubleClick={interaction.handleDoubleClick}
            />

            {/* Hidden file input */}
            <input
              type="file"
              ref={annotations.imageInputRef}
              className="hidden"
              accept="image/*"
              onChange={annotations.handleImageFileChange}
            />
          </div>
        </div>

        <div className="lg:col-span-1 xl:col-span-1 h-full overflow-y-auto">
          <SidePanel
            video={video}
            selectedVersion={selectedVersion}
            onVersionChange={setSelectedVersionId}
            onTimecodeClick={handleTimecodeClick}
            onAnnotationClick={handleAnnotationClick}
            currentTimeFormatted={formatTime(currentTime)}
            onDeleteComment={handleDeleteComment}
            onVersionStatusChange={handleVersionStatusChange}
            onNewVersionUploaded={() => {
              toast({ title: '新版本已上傳', description: '資料將在短時間內更新。' });
            }}
            isAdmin={isAdmin}
          />
        </div>
      </main>

      {/* Exit confirmation dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>尚未儲存的變更</AlertDialogTitle>
            <AlertDialogDescription>
              您有未儲存的註解變更。要如何處理？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                annotations.exit();
                setShowExitDialog(false);
              }}
            >
              不儲存退出
            </AlertDialogAction>
            <AlertDialogAction
              onClick={async () => {
                await annotations.save();
                setShowExitDialog(false);
              }}
            >
              儲存並退出
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
