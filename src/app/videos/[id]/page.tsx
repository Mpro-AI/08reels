'use client';
import { useParams } from 'next/navigation';
import { useState, useRef, useEffect, useCallback, useMemo, useContext } from 'react';
import Header from '@/components/header';
import VideoPlayer from '@/components/video/player';
import SidePanel from '@/components/video/side-panel';
import type { Video, Version, Comment, VersionStatus, User, Annotation, PenAnnotationData, ImageAnnotationData, TextAnnotationData } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useFirestore, useStorage } from '@/firebase';
import { doc } from 'firebase/firestore';
import { addAnnotationsToVersion, setVersionStatus, deleteCommentFromVersion, updateAnnotationInVersion } from '@/firebase/firestore/videos';
import { uploadAnnotationImage } from '@/firebase/storage';
import AnnotationCanvas from '@/components/video/annotation-canvas';
import AnnotationToolbar from '@/components/video/annotation-toolbar';
import TextAnnotationInput from '@/components/video/text-annotation-input';
import { Skeleton } from '@/components/ui/skeleton';
import { AppLayoutContext } from '@/components/app-layout';

function formatTime(seconds: number): string {
  if (isNaN(seconds)) return '00:00:00.000';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${[h, m, s].map(v => v.toString().padStart(2, '0')).join(':')}.${ms.toString().padStart(3, '0')}`;
}

export type AnnotationMode = 'pen' | 'select' | 'image' | 'text';

export default function VideoPage() {
  const params = useParams();
  const videoId = params.id as string;
  const firestore = useFirestore();
  const storage = useStorage();
  const { user } = useAuth();
  const { videos: allVideos, loading: videosLoading } = useContext(AppLayoutContext);
  
  const videoRef = useMemo(() => {
    if (!firestore || !videoId) return null;
    return doc(firestore, 'videos', videoId);
  }, [firestore, videoId]);

  const { data: video, loading, setData: setVideo } = useDoc<Video>(videoRef);
  
  const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>();
  const playerRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const { toast } = useToast();

  const [isAnnotating, setIsAnnotating] = useState(false);
  const [annotationMode, setAnnotationMode] = useState<AnnotationMode>('select');
  const [penColor, setPenColor] = useState('#FF0000');
  const [penLineWidth, setPenLineWidth] = useState(3);
  
  const [newAnnotations, setNewAnnotations] = useState<Annotation[]>([]);
  const [modifiedAnnotationIds, setModifiedAnnotationIds] = useState<Set<string>>(new Set()); // 追蹤已修改的現有註解
  const [isUploading, setIsUploading] = useState(false);
  const imageAnnotationInputRef = useRef<HTMLInputElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  const [isTextAnnotating, setIsTextAnnotating] = useState(false);
  const [textAnnotationCoords, setTextAnnotationCoords] = useState<{ canvas: { x: number, y: number }, screen: { x: number, y: number } } | null>(null);

  const [videoNaturalSize, setVideoNaturalSize] = useState<{width: number, height: number}>({
    width: 1920,
    height: 1080
  });

  const [preloadedUrls, setPreloadedUrls] = useState<Set<string>>(new Set());
  
  const selectedVersion = video?.versions.find(v => v.id === selectedVersionId);
  const currentThumbnail = selectedVersion?.thumbnailUrl || video?.thumbnailUrl;
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (video && !selectedVersionId) {
        const currentActiveVersion = video.versions.find(v => v.isCurrentActive);
        if (currentActiveVersion) {
            setSelectedVersionId(currentActiveVersion.id);
        } else if (video.versions.length > 0) {
            const latestVersion = video.versions.sort((a,b) => b.versionNumber - a.versionNumber)[0];
            setSelectedVersionId(latestVersion.id);
        }
    }
  }, [video, selectedVersionId]);

  useEffect(() => {
    const video = playerRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setVideoNaturalSize({
        width: video.videoWidth,
        height: video.videoHeight
      });
      console.log('📹 影片原始尺寸:', video.videoWidth, 'x', video.videoHeight);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    if (video.videoWidth > 0) {
      handleLoadedMetadata();
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [selectedVersion?.videoUrl]);

  // Intelligent preloading of the next video
  useEffect(() => {
    if (!allVideos || allVideos.length < 2 || !videoId) return;

    const currentVideoIndex = allVideos.findIndex(v => v.id === videoId);
    
    if (currentVideoIndex !== -1 && currentVideoIndex < allVideos.length - 1) {
      const nextVideo = allVideos[currentVideoIndex + 1];
      const nextVideoActiveVersion = nextVideo.versions.find(v => v.isCurrentActive) || nextVideo.versions.sort((a, b) => b.versionNumber - a.versionNumber)[0];
      
      if (nextVideoActiveVersion) {
          const nextUrl = nextVideoActiveVersion.videoUrl;
          if (!preloadedUrls.has(nextUrl)) {
              console.log(`🧠 Preloading next video: ${nextVideo.title}`);
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


  const enterAnnotationMode = (mode: AnnotationMode) => {
    if (!isAdmin) return;
    if (playerRef.current) {
      playerRef.current.pause();
    }
    setIsAnnotating(true);
    setAnnotationMode(mode);

    if (mode === 'image') {
      imageAnnotationInputRef.current?.click();
    }
  };

  const handleAnnotationClick = useCallback((timecode: number, mode: AnnotationMode) => {
    if (!isAdmin) return;
    if (playerRef.current) {
      playerRef.current.currentTime = timecode;
    }
    enterAnnotationMode(mode);
  }, [isAdmin]);

  const handleTimecodeClick = useCallback((timecode: number) => {
    if (playerRef.current) {
      playerRef.current.currentTime = timecode;
    }
  }, []);

  const handleVersionStatusChange = useCallback((versionId: string, status: VersionStatus) => {
    if (!firestore || !video || !user) return;
    
    if (user.role !== 'admin' && user.id !== video.author.id) {
        toast({
            variant: 'destructive',
            title: '權限不足',
            description: '只有管理員或專案作者才能變更版本狀態。'
        });
        return;
    }

    setVersionStatus(firestore, video.id, versionId, status);
    
    toast({
      title: '版本狀態已更新',
    });
  }, [firestore, video, user, toast]);

  const handleDeleteComment = useCallback((commentId: string) => {
    if (!firestore || !video || !user || !selectedVersionId) return;
    
    deleteCommentFromVersion(firestore, video.id, selectedVersionId, commentId);

    toast({
      variant: 'default',
      title: '評論已刪除',
    });

  }, [firestore, video, user, selectedVersionId, toast]);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storage || !user || !selectedVersionId || !video) {
        if (imageAnnotationInputRef.current) imageAnnotationInputRef.current.value = '';
        return;
    }

    setIsUploading(true);
    setAnnotationMode('select');

    try {
        const imageUrl = await uploadAnnotationImage(storage, file, videoId, selectedVersionId);
        
        const canvasWidth = videoNaturalSize.width;
        const canvasHeight = videoNaturalSize.height;
        
        const imageWidth = canvasWidth * 0.2;
        const tempImage = new Image();
        tempImage.src = URL.createObjectURL(file);
        await new Promise(resolve => tempImage.onload = resolve);
        const aspectRatio = tempImage.width / tempImage.height;
        const imageHeight = imageWidth / aspectRatio;
        URL.revokeObjectURL(tempImage.src);

        const newAnnotation: Annotation = {
            id: `new-${Date.now()}`,
            type: 'image',
            data: {
                url: imageUrl,
                x: (canvasWidth - imageWidth) / 2,
                y: (canvasHeight - imageHeight) / 2,
                width: imageWidth,
                height: imageHeight,
                rotation: 0,
            } as ImageAnnotationData,
            author: { id: user.id, name: user.name },
            createdAt: new Date().toISOString(),
            timecode: Math.floor(currentTime),
        };
        
        setNewAnnotations(prev => [...prev, newAnnotation]);
        toast({ title: '圖片已新增', description: '您現在可以拖曳、縮放或旋轉圖片。' });

    } catch (error) {
        toast({ variant: 'destructive', title: '圖片上傳失敗', description: '無法上傳註解圖片。' });
        console.error(error);
    } finally {
        setIsUploading(false);
        if (imageAnnotationInputRef.current) {
          imageAnnotationInputRef.current.value = '';
        }
    }
  };

  const handleAddAnnotation = (data: PenAnnotationData | TextAnnotationData, type: 'pen' | 'text') => {
    if (!user) return;
  
    const commonData = {
      author: { id: user.id, name: user.name },
      createdAt: new Date().toISOString(),
      timecode: Math.floor(currentTime),
    };
  
    let annotationData: Annotation;
  
    if (type === 'pen') {
      annotationData = {
        id: `new-${Date.now()}`,
        type: 'pen',
        data: data as PenAnnotationData,
        ...commonData,
      };
    } else if (type === 'text') {
      annotationData = {
        id: `new-${Date.now()}`,
        type: 'text',
        data: data as TextAnnotationData,
        ...commonData,
      };
    } else {
      return;
    }
  
    setNewAnnotations(prev => [...prev, annotationData]);
  };
  
  const handleEnterTextMode = (canvasCoords: { x: number; y: number }, screenCoords: { x: number; y: number }) => {
    setTextAnnotationCoords({ canvas: canvasCoords, screen: screenCoords });
    setIsTextAnnotating(true);
  };
  
  const handleCompleteTextAnnotation = (text: string, fontSize: number, color: string, backgroundColor?: string) => {
    if (!user || !textAnnotationCoords) return;

    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    // 根據影片尺寸縮放字體大小
    const scaledFontSize = fontSize * (videoNaturalSize.height / 1080);
    ctx.font = `${scaledFontSize}px sans-serif`;
    const textMetrics = ctx.measureText(text);

    // 使用 fontSize 作為高度基準，加上適當的行高比例 (1.2)
    // 這樣文字看起來比例更自然
    const textHeight = scaledFontSize * 1.2;

    // 使用 canvas 坐標來放置註解
    const textData: TextAnnotationData = {
      text,
      x: textAnnotationCoords.canvas.x - textMetrics.width / 2,
      y: textAnnotationCoords.canvas.y - textHeight / 2,
      width: textMetrics.width,
      height: textHeight,
      fontSize: scaledFontSize,
      color,
      backgroundColor,
      rotation: 0,
    };

    const newAnnotation: Annotation = {
      id: `new-${Date.now()}`,
      type: 'text',
      data: textData,
      author: { id: user.id, name: user.name },
      createdAt: new Date().toISOString(),
      timecode: Math.floor(currentTime),
    };

    setNewAnnotations(prev => [...prev, newAnnotation]);
    setIsTextAnnotating(false);
    setTextAnnotationCoords(null);
    // 保持標註模式開啟,讓用戶可以繼續編輯
    setAnnotationMode('select');
    // 不要設置 setIsAnnotating(false),讓用戶可以拖拉/縮放剛創建的文字
    toast({ title: '文字註解已新增' });
  };


  const handleUpdateAnnotation = (updatedAnnotation: Annotation) => {
    if (updatedAnnotation.id.startsWith('new-')) {
        // 新註解只更新本地狀態
        setNewAnnotations(prev => prev.map(a => a.id === updatedAnnotation.id ? updatedAnnotation : a));
    } else {
        // 已儲存的註解 - 只有管理員可以修改
        if (!isAdmin || !video || !selectedVersionId) return;

        // 標記此註解已被修改
        setModifiedAnnotationIds(prev => new Set(prev).add(updatedAnnotation.id));

        // 更新本地顯示
        if (setVideo) {
            const updatedVideo = { ...video };
            const versionIndex = updatedVideo.versions.findIndex(v => v.id === selectedVersionId);
            if (versionIndex > -1) {
                const annotationIndex = updatedVideo.versions[versionIndex].annotations.findIndex(a => a.id === updatedAnnotation.id);
                if (annotationIndex > -1) {
                    updatedVideo.versions[versionIndex].annotations[annotationIndex] = updatedAnnotation;
                    setVideo(updatedVideo);
                }
            }
        }
    }
  };

  // 清理註解數據，移除 undefined 值（Firestore 不接受 undefined）
  const cleanAnnotationData = (annotation: Annotation): Annotation => {
    const cleaned = JSON.parse(JSON.stringify(annotation, (_, value) =>
      value === undefined ? null : value
    ));
    // 移除 null 值的可選欄位
    if (cleaned.data && cleaned.data.backgroundColor === null) {
      delete cleaned.data.backgroundColor;
    }
    return cleaned;
  };

  const handleSaveAnnotations = async () => {
    if (!firestore || !user || !video || !selectedVersionId) return;

    const hasNewAnnotations = newAnnotations.length > 0;
    const hasModifiedAnnotations = modifiedAnnotationIds.size > 0;

    if (!hasNewAnnotations && !hasModifiedAnnotations) return;

    try {
      // 儲存新註解
      if (hasNewAnnotations) {
        const annotationsToAdd = newAnnotations.map(ann => {
          const { id, ...rest } = cleanAnnotationData(ann);
          return rest;
        });
        await addAnnotationsToVersion(firestore, video.id, selectedVersionId, annotationsToAdd);
      }

      // 儲存已修改的現有註解
      if (hasModifiedAnnotations) {
        const currentVersion = video.versions.find(v => v.id === selectedVersionId);
        if (currentVersion) {
          for (const annotationId of modifiedAnnotationIds) {
            const annotation = currentVersion.annotations.find(a => a.id === annotationId);
            if (annotation) {
              const cleanedAnnotation = cleanAnnotationData(annotation);
              await updateAnnotationInVersion(firestore, video.id, selectedVersionId, cleanedAnnotation);
            }
          }
        }
      }

      setNewAnnotations([]);
      setModifiedAnnotationIds(new Set());
      setIsAnnotating(false);
      setAnnotationMode('select');
      toast({ title: '註解已儲存' });
    } catch (error) {
      console.error('儲存註解失敗:', error);
      toast({ variant: 'destructive', title: '儲存失敗', description: '無法儲存註解，請稍後再試。' });
    }
  };
  
  const exitAnnotationMode = () => {
    if (newAnnotations.length > 0 || modifiedAnnotationIds.size > 0) {
      const confirmExit = confirm('您有尚未儲存的變更，確定要捨棄嗎？');
      if (!confirmExit) return;
    }
    setNewAnnotations([]);
    setModifiedAnnotationIds(new Set());
    setIsAnnotating(false);
    setAnnotationMode('select');
    setIsUploading(false);
    setIsTextAnnotating(false);
    setTextAnnotationCoords(null);
  };

  const togglePlayPause = useCallback(() => {
    if (!playerRef.current) return;
    if (playerRef.current.paused) {
      playerRef.current.play();
    } else {
      playerRef.current.pause();
    }
  }, []);


  useEffect(() => {
    const videoElement = playerRef.current;
    if (!videoElement) return;

    const onTimeUpdate = () => setCurrentTime(videoElement.currentTime);
    videoElement.addEventListener('timeupdate', onTimeUpdate);
    return () => videoElement.removeEventListener('timeupdate', onTimeUpdate);
  }, [playerRef, selectedVersion]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          return;
        }
        event.preventDefault();
        togglePlayPause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [togglePlayPause]);
  
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

  const allAnnotations = [...(selectedVersion.annotations || []), ...newAnnotations];
  const visibleAnnotations = allAnnotations.filter(a => currentTime >= a.timecode && currentTime < a.timecode + 0.5);

  return (
    <>
        <Header title={video.title} />
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 overflow-hidden">
            <div className="lg:col-span-2 xl:col-span-3 bg-background p-4 h-full max-h-full flex items-center justify-center">
              <div ref={videoContainerRef} className="relative w-full max-w-5xl mx-auto">
                <VideoPlayer 
                  src={selectedVersion.videoUrl} 
                  poster={currentThumbnail}
                  videoRef={playerRef} 
                  isPaused={isAnnotating || isTextAnnotating}
                  qualities={selectedVersion.qualities}
                />
                {/* 註解模式提示（手機友好） */}
                {(isAnnotating || isTextAnnotating) && (
                  <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2">
                    <span>📝 註解模式已啟用（影片已暫停）</span>
                    <button
                      onClick={exitAnnotationMode}
                      className="bg-white text-orange-500 px-3 py-1 rounded hover:bg-gray-100 font-bold"
                    >
                      退出
                    </button>
                  </div>
                )}
                {isAdmin && isAnnotating && (
                  <div className="absolute top-4 z-20 flex w-full justify-center">
                     <AnnotationToolbar
                        mode={annotationMode}
                        onModeChange={(mode) => {
                            setAnnotationMode(mode)
                            if (mode === 'image') {
                                imageAnnotationInputRef.current?.click();
                            }
                        }}
                        color={penColor}
                        onColorChange={setPenColor}
                        lineWidth={penLineWidth}
                        onLineWidthChange={setPenLineWidth}
                        onSave={handleSaveAnnotations}
                        onExit={exitAnnotationMode}
                        isSavingDisabled={newAnnotations.length === 0 && modifiedAnnotationIds.size === 0}
                        isUploading={isUploading}
                      />
                  </div>
                )}
                {isAdmin && isTextAnnotating && textAnnotationCoords && (
                    <TextAnnotationInput
                        x={textAnnotationCoords.screen.x}
                        y={textAnnotationCoords.screen.y}
                        onComplete={handleCompleteTextAnnotation}
                        onCancel={() => {
                            setIsTextAnnotating(false);
                            setTextAnnotationCoords(null);
                            setIsAnnotating(false);
                            setAnnotationMode('select');
                        }}
                        initialColor={penColor}
                        containerRef={videoContainerRef}
                    />
                )}
                <AnnotationCanvas 
                  width={videoNaturalSize.width}
                  height={videoNaturalSize.height}
                  annotations={visibleAnnotations}
                  onAddAnnotation={handleAddAnnotation}
                  onUpdateAnnotation={handleUpdateAnnotation}
                  onEnterTextMode={handleEnterTextMode}
                  annotationMode={annotationMode}
                  penColor={penColor}
                  penLineWidth={penLineWidth}
                  isAnnotating={isAnnotating && !isTextAnnotating}
                />
                <input 
                  type="file" 
                  ref={imageAnnotationInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageFileChange}
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
                      // Data will automatically refresh via useDoc subscription
                      toast({
                        title: '新版本已上傳',
                        description: '資料將在短時間內更新。'
                      });
                    }}
                    isAdmin={isAdmin}
                />
            </div>
        </main>
    </>
  );
}
