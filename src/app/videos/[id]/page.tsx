'use client';
import { useParams } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import AppLayout from '@/components/app-layout';
import Header from '@/components/header';
import VideoPlayer from '@/components/video/video-player';
import SidePanel from '@/components/video/side-panel';
import { videos as initialVideos } from '@/lib/mock-data';
import { Skeleton } from '@/components/ui/skeleton';
import type { Video, Version, Comment, VersionStatus } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

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
  
  const [videos, setVideos] = useState(initialVideos);
  const [video, setVideo] = useState<Video | undefined>(videos.find(v => v.id === videoId));

  const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>(
    video?.versions.find(v => v.isCurrentActive)?.id || video?.versions[0]?.id
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();
  
  const selectedVersion = video?.versions.find(v => v.id === selectedVersionId);

  useEffect(() => {
    const currentVideo = videos.find(v => v.id === videoId);
    setVideo(currentVideo);
    if (currentVideo) {
      setSelectedVersionId(currentVideo.versions.find(v => v.isCurrentActive)?.id || currentVideo.versions[0]?.id);
    }
  }, [videoId, videos]);

  const handleTimecodeClick = useCallback((timecode: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timecode;
      videoRef.current.play();
    }
  }, []);

  const handleAddComment = useCallback((commentText: string, timecode?: number) => {
    if (!video || !user || !selectedVersionId) return;
    
    const commentTime = timecode !== undefined ? timecode : currentTime;

    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      timecode: Math.floor(commentTime),
      timecodeFormatted: formatTime(commentTime),
      text: commentText,
      author: { id: user.id, name: user.name },
      createdAt: new Date().toISOString(),
    };

    const updatedVideos = videos.map(v => {
      if (v.id === video.id) {
        return {
          ...v,
          versions: v.versions.map(ver => {
            if (ver.id === selectedVersionId) {
              return {
                ...ver,
                comments: [...ver.comments, newComment],
              };
            }
            return ver;
          }),
        };
      }
      return v;
    });

    setVideos(updatedVideos);

  }, [video, user, currentTime, videos, selectedVersionId]);

  const handleVersionStatusChange = useCallback((versionId: string, status: VersionStatus) => {
    if (!video) return;

    const updatedVideos = videos.map(v => {
      if (v.id === video.id) {
        let isNewActiveVersion = status === 'approved';

        const newVersions = v.versions.map(ver => {
          if (ver.id === versionId) {
            return { ...ver, status, isCurrentActive: isNewActiveVersion };
          }
          // If a new version is approved, all other versions are no longer active
          if (isNewActiveVersion) {
            return { ...ver, isCurrentActive: false };
          }
          return ver;
        });

        return { ...v, versions: newVersions };
      }
      return v;
    });
    
    setVideos(updatedVideos);
    toast({
      title: '版本狀態已更新',
    });
  }, [video, videos, toast]);


  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const onTimeUpdate = () => setCurrentTime(videoElement.currentTime);
    videoElement.addEventListener('timeupdate', onTimeUpdate);
    return () => videoElement.removeEventListener('timeupdate', onTimeUpdate);
  }, []);
  
  if (!video || !selectedVersion) {
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
                    <VideoPlayer src={selectedVersion.videoUrl || video.videoUrl} videoRef={videoRef} />
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
