'use client';
import { useParams } from 'next/navigation';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import AppLayout from '@/components/app-layout';
import Header from '@/components/header';
import VideoPlayer from '@/components/video/video-player';
import SidePanel from '@/components/video/side-panel';
import { Skeleton } from '@/components/ui/skeleton';
import type { Video, Version, Comment, VersionStatus } from '@/lib/types';
import { useAuth as useAppAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { addCommentToVersion, setVersionStatus } from '@/firebase/firestore/videos';

function formatTime(seconds: number): string {
  if (isNaN(seconds)) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
}

export default function VideoPage() {
  const params = useParams();
  const videoId = params.id as string;
  const firestore = useFirestore();

  const videoRef = useMemo(() => {
    if (!firestore || !videoId) return null;
    return doc(firestore, 'videos', videoId);
  }, [firestore, videoId]);

  const { data: video, loading } = useDoc<Video>(videoRef);
  
  const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>();
  const playerRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const { user } = useAppAuth();
  const { toast } = useToast();
  
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

    const newComment: Omit<Comment, 'id' | 'createdAt'> = {
      timecode: Math.floor(commentTime),
      timecodeFormatted: formatTime(commentTime),
      text: commentText,
      author: { id: user.id, name: user.name },
    };
    
    addCommentToVersion(firestore, video.id, selectedVersionId, newComment);

  }, [firestore, video, user, currentTime, selectedVersionId]);

  const handleVersionStatusChange = useCallback((versionId: string, status: VersionStatus) => {
    if (!firestore || !video) return;

    setVersionStatus(firestore, video.id, versionId, status);
    
    toast({
      title: '版本狀態已更新',
    });
  }, [firestore, video, toast]);


  useEffect(() => {
    const videoElement = playerRef.current;
    if (!videoElement) return;

    const onTimeUpdate = () => setCurrentTime(videoElement.currentTime);
    videoElement.addEventListener('timeupdate', onTimeUpdate);
    return () => videoElement.removeEventListener('timeupdate', onTimeUpdate);
  }, []);
  
  if (loading || !video || !selectedVersion) {
    return (
        <AppLayout>
            <div className="flex flex-1 flex-col">
                <Header title="載入中..." />
                <main className="flex-1 p-8 grid grid-cols-3 gap-8">
                    <div className="col-span-2 space-y-4">
                        <Skeleton className="w-full aspect-video" />
                    </div>
                    <div className="col-span-1 space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-64 w-full" />
                    </div>
                </main>
            </div>
        </AppLayout>
    );
  }

  return (
    <AppLayout>
        <div className="flex flex-1 flex-col h-screen overflow-hidden">
            <Header title={video.title} />
            <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 overflow-hidden">
                <div className="lg:col-span-2 xl:col-span-3 bg-background p-4 flex items-center justify-center">
                    <VideoPlayer src={selectedVersion.videoUrl || video.videoUrl} videoRef={playerRef} />
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
                    />
                </div>
            </main>
        </div>
    </AppLayout>
  );
}
