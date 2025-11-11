'use client';
import { useParams } from 'next/navigation';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import AppLayout from '@/components/app-layout';
import Header from '@/components/header';
import VideoPlayer from '@/components/video/player';
import SidePanel from '@/components/video/side-panel';
import type { Video, Version, Comment, VersionStatus, User, Annotation, PenAnnotationData, ImageAnnotationData } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useFirestore, useStorage } from '@/firebase';
import { doc } from 'firebase/firestore';
import { addCommentToVersion, setVersionStatus, deleteCommentFromVersion, addAnnotationsToVersion } from '@/firebase/firestore/videos';
import { uploadAnnotationImage } from '@/firebase/storage';
import AnnotationCanvas from '@/components/video/annotation-canvas';
import { Button } from '@/components/ui/button';
import { X, Save, Loader2 } from 'lucide-react';

function formatTime(seconds: number): string {
  if (isNaN(seconds)) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
}

type AnnotationMode = 'pen' | 'image' | null;

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

  const { data: video, loading } = useDoc<Video>(videoRef);
  
  const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>();
  const playerRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const { toast } = useToast();

  const [annotationMode, setAnnotationMode] = useState<AnnotationMode>(null);
  const [newAnnotations, setNewAnnotations] = useState<Annotation[]>([]);
  const [imageAnnotationFile, setImageAnnotationFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const imageAnnotationInputRef = useRef<HTMLInputElement>(null);

  const isAnnotating = annotationMode !== null;
  
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

  const handleAddComment = useCallback((commentText: string, timecode?: number) => {
    if (!firestore || !video || !user || !selectedVersionId) return;
    
    const commentTime = timecode !== undefined ? timecode : currentTime;

    const newComment: Omit<Comment, 'id' | 'createdAt' | 'author'> = {
      timecode: Math.floor(commentTime),
      timecodeFormatted: formatTime(commentTime),
      text: commentText,
    };
    
    addCommentToVersion(firestore, video.id, selectedVersionId, newComment, user as User);

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
    setAnnotationMode(mode);
    if (mode === 'image') {
      imageAnnotationInputRef.current?.click();
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageAnnotationFile(file);
      toast({ title: '圖片已選取', description: '請在影片畫面上點擊以放置圖片。' });
    } else {
      setAnnotationMode(null); // No file selected, exit image mode
    }
    // Reset file input to allow selecting the same file again
    if (imageAnnotationInputRef.current) {
      imageAnnotationInputRef.current.value = '';
    }
  };

  const handleAddAnnotation = async (data: PenAnnotationData | { x: number, y: number }) => {
    if (!user) return;

    let newAnnotation: Omit<Annotation, 'id'> | null = null;
    const commonData = {
      author: { id: user.id, name: user.name },
      createdAt: new Date().toISOString(),
      timecode: Math.floor(currentTime),
    };

    if (annotationMode === 'pen') {
      newAnnotation = {
        type: 'pen',
        data: data as PenAnnotationData,
        ...commonData,
      };
    } else if (annotationMode === 'image' && imageAnnotationFile && 'x' in data) {
      setIsUploading(true);
      try {
        const imageUrl = await uploadAnnotationImage(storage!, imageAnnotationFile, videoId, selectedVersionId!);
        
        // Define a fixed size for the placed image for now
        const imageWidth = 200; 
        const imageHeight = (imageWidth / (imageAnnotationFile.type.includes('w') ? 16 : 9)) * 9;


        newAnnotation = {
          type: 'image',
          data: {
            url: imageUrl,
            x: data.x,
            y: data.y,
            width: imageWidth,
            height: imageHeight,
          } as ImageAnnotationData,
          ...commonData,
        };
      } catch (error) {
        toast({ variant: 'destructive', title: '圖片上傳失敗', description: '無法上傳註解圖片。' });
        console.error(error);
      } finally {
        setIsUploading(false);
        setImageAnnotationFile(null); // Clear the file after processing
        setAnnotationMode(null); // Exit image mode after placing
      }
    }
    
    if (newAnnotation) {
      // The `id` will be generated within the firestore function
      setNewAnnotations(prev => [...prev, { ...newAnnotation, id: '' }]);
    }
  };

  const handleSaveAnnotations = () => {
    if (!firestore || !user || !video || !selectedVersionId || newAnnotations.length === 0) return;
    
    const annotationsToAdd = newAnnotations.map(({id, ...rest}) => rest);
    
    addAnnotationsToVersion(firestore, video.id, selectedVersionId, annotationsToAdd);
    
    setNewAnnotations([]);
    setAnnotationMode(null);
    toast({ title: '註解已儲存' });
  };
  
  const handleCancelAnnotations = () => {
    setNewAnnotations([]);
    setAnnotationMode(null);
    setImageAnnotationFile(null);
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
                    {(isAnnotating || isUploading) && (
                      <div className="absolute top-4 right-4 z-20 flex gap-2">
                        {isUploading ? (
                          <Button variant="outline" size="icon" disabled>
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </Button>
                        ) : (
                          <>
                            <Button variant="outline" size="icon" onClick={handleCancelAnnotations}>
                              <X className="h-4 w-4" />
                            </Button>
                            <Button size="icon" onClick={handleSaveAnnotations} disabled={newAnnotations.length === 0}>
                              <Save className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                    <AnnotationCanvas 
                      width={playerRef.current?.clientWidth || 0}
                      height={playerRef.current?.clientHeight || 0}
                      annotations={visibleAnnotations}
                      onAddAnnotation={handleAddAnnotation}
                      annotationMode={annotationMode}
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
                        onEnterAnnotationMode={enterAnnotationMode}
                    />
                </div>
            </main>
        </div>
    </AppLayout>
  );
}
