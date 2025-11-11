'use client';
import { useParams } from 'next/navigation';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import AppLayout from '@/components/app-layout';
import Header from '@/components/header';
import VideoPlayer from '@/components/video/player';
import SidePanel from '@/components/video/side-panel';
import type { Video, Version, Comment, VersionStatus, User, Annotation, PenAnnotationData, ImageAnnotationData, TextAnnotationData } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useFirestore, useStorage } from '@/firebase';
import { doc } from 'firebase/firestore';
import { addAnnotationsToVersion, setVersionStatus, deleteCommentFromVersion, updateAnnotationInVersion, addCommentToVersion } from '@/firebase/firestore/videos';
import { uploadAnnotationImage } from '@/firebase/storage';
import AnnotationCanvas from '@/components/video/annotation-canvas';
import AnnotationToolbar from '@/components/video/annotation-toolbar';

function formatTime(seconds: number): string {
  if (isNaN(seconds)) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
}

export type AnnotationMode = 'pen' | 'select' | 'image' | 'text';

export default function VideoPage() {
  const params = useParams();
  const videoId = params.id as string;
  const firestore = useFirestore();
  const storage = useStorage();
  const { user } = useAuth();
  
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
  const [isUploading, setIsUploading] = useState(false);
  const imageAnnotationInputRef = useRef<HTMLInputElement>(null);
  
  const selectedVersion = video?.versions.find(v => v.id === selectedVersionId);

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

  const handleTimecodeClick = useCallback((timecode: number) => {
    if (playerRef.current) {
      playerRef.current.currentTime = timecode;
      playerRef.current.play();
    }
  }, []);

  const handleAddComment = useCallback((commentText: string) => {
    if (!firestore || !video || !user || !selectedVersionId) return;
    
    addCommentToVersion(
      firestore,
      video.id,
      selectedVersionId,
      {
        text: commentText,
        timecode: Math.floor(currentTime),
        timecodeFormatted: formatTime(currentTime),
      },
      user,
    );

  }, [firestore, video, user, currentTime, selectedVersionId]);

  const handleVersionStatusChange = useCallback((versionId: string, status: VersionStatus) => {
    if (!firestore || !video || !user) return;
    
    if (user.role !== 'admin') {
        toast({
            variant: 'destructive',
            title: '權限不足',
            description: '只有管理員才能變更版本狀態。'
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

  const enterAnnotationMode = (mode: AnnotationMode) => {
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
    if (playerRef.current) {
      playerRef.current.currentTime = timecode;
    }
    enterAnnotationMode(mode);
  }, []);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storage || !user || !selectedVersionId || !video) {
        if (imageAnnotationInputRef.current) imageAnnotationInputRef.current.value = '';
        return;
    }

    setIsUploading(true);

    try {
        const imageUrl = await uploadAnnotationImage(storage, file, videoId, selectedVersionId);
        
        const playerWidth = playerRef.current?.clientWidth || 0;
        const playerHeight = playerRef.current?.clientHeight || 0;
        
        const imageWidth = 200;
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
                x: (playerWidth - imageWidth) / 2,
                y: (playerHeight - imageHeight) / 2,
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
        // Set mode to select to allow interaction with the new image
        setAnnotationMode('select');
    }
  };

  const handleAddAnnotation = (data: PenAnnotationData | TextAnnotationData, type: 'pen' | 'text') => {
    if (!user) return;

    const commonData = {
      author: { id: user.id, name: user.name },
      createdAt: new Date().toISOString(),
      timecode: Math.floor(currentTime),
    };
    
    const newAnnotation: Annotation = {
        id: `new-${Date.now()}`,
        type: type,
        data: data,
        ...commonData,
    };
    
    setNewAnnotations(prev => [...prev, newAnnotation]);
    if (type === 'text') {
      setAnnotationMode('select'); // Switch to select mode to allow interaction
    }
  };

  const handleUpdateAnnotation = (updatedAnnotation: Annotation) => {
    if (updatedAnnotation.id.startsWith('new-')) {
        setNewAnnotations(prev => prev.map(a => a.id === updatedAnnotation.id ? updatedAnnotation : a));
    } else {
        if (!firestore || !video || !selectedVersionId) return;
        updateAnnotationInVersion(firestore, video.id, selectedVersionId, updatedAnnotation);
        
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

  const handleSaveAnnotations = () => {
    if (!firestore || !user || !video || !selectedVersionId || newAnnotations.length === 0) return;
    
    const annotationsToAdd = newAnnotations.map(({id, ...rest}) => rest);
    
    addAnnotationsToVersion(firestore, video.id, selectedVersionId, annotationsToAdd);
    
    setNewAnnotations([]);
    setIsAnnotating(false);
    setAnnotationMode('select');
    toast({ title: '註解已儲存' });
  };
  
  const exitAnnotationMode = () => {
    if (newAnnotations.length > 0) {
      const confirmExit = confirm('您有尚未儲存的註解，確定要捨棄嗎？');
      if (!confirmExit) return;
    }
    setNewAnnotations([]);
    setIsAnnotating(false);
    setAnnotationMode('select');
    setIsUploading(false);
  };


  useEffect(() => {
    const videoElement = playerRef.current;
    if (!videoElement) return;

    const onTimeUpdate = () => setCurrentTime(videoElement.currentTime);
    videoElement.addEventListener('timeupdate', onTimeUpdate);
    return () => videoElement.removeEventListener('timeupdate', onTimeUpdate);
  }, [playerRef, selectedVersion]);
  
  if (loading || !video || !selectedVersion) {
    return (
        <AppLayout>
            <div className="flex flex-1 flex-col">
                <Header title="載入中..." />
                <main className="flex-1 p-8 grid grid-cols-3 gap-8">
                </main>
            </div>
        </AppLayout>
    );
  }

  const allAnnotations = [...(selectedVersion.annotations || []), ...newAnnotations];
  const visibleAnnotations = allAnnotations.filter(a => currentTime >= a.timecode && currentTime < a.timecode + 0.5);

  return (
    <AppLayout>
        <div className="flex flex-1 flex-col h-screen overflow-hidden">
            <Header title={video.title} />
            <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 overflow-hidden">
                <div className="lg:col-span-2 xl:col-span-3 bg-background p-4 flex items-center justify-center relative">
                    <VideoPlayer src={selectedVersion.videoUrl} videoRef={playerRef} isPaused={isAnnotating} />
                    {isAnnotating && (annotationMode === 'pen' || annotationMode === 'select') && (
                      <div className="absolute top-4 z-20 flex w-full justify-center">
                         <AnnotationToolbar
                            mode={annotationMode}
                            onModeChange={setAnnotationMode}
                            color={penColor}
                            onColorChange={setPenColor}
                            lineWidth={penLineWidth}
                            onLineWidthChange={setPenLineWidth}
                            onSave={handleSaveAnnotations}
                            onExit={exitAnnotationMode}
                            isSavingDisabled={newAnnotations.length === 0}
                            isUploading={isUploading}
                          />
                      </div>
                    )}
                    <AnnotationCanvas 
                      width={playerRef.current?.clientWidth || 0}
                      height={playerRef.current?.clientHeight || 0}
                      annotations={visibleAnnotations}
                      onAddAnnotation={handleAddAnnotation}
                      onUpdateAnnotation={handleUpdateAnnotation}
                      annotationMode={annotationMode}
                      penColor={penColor}
                      penLineWidth={penLineWidth}
                      isAnnotating={isAnnotating}
                    />
                    <input 
                      type="file" 
                      ref={imageAnnotationInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageFileChange}
                    />
                </div>
                <div className="lg:col-span-1 xl:col-span-1 h-full overflow-y-auto">
                    <SidePanel 
                        video={video}
                        selectedVersion={selectedVersion}
                        onVersionChange={setSelectedVersionId}
                        onTimecodeClick={handleTimecodeClick} 
                        currentTimeFormatted={formatTime(currentTime)}
                        onAddComment={handleAddComment}
                        onVersionStatusChange={handleVersionStatusChange}
                        onDeleteComment={handleDeleteComment}
                        onAnnotationClick={handleAnnotationClick}
                    />
                </div>
            </main>
        </div>
    </AppLayout>
  );
}
