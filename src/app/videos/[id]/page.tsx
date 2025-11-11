'use client';
import { useParams } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import AppLayout from '@/components/app-layout';
import Header from '@/components/header';
import VideoPlayer from '@/components/video/video-player';
import SidePanel from '@/components/video/side-panel';
import { videos } from '@/lib/mock-data';
import { Skeleton } from '@/components/ui/skeleton';

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
  const video = videos.find(v => v.id === videoId);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);

  const handleTimecodeClick = useCallback((timecode: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timecode;
      videoRef.current.play();
    }
  }, []);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const onTimeUpdate = () => setCurrentTime(videoElement.currentTime);
    videoElement.addEventListener('timeupdate', onTimeUpdate);
    return () => videoElement.removeEventListener('timeupdate', onTimeUpdate);
  }, []);
  
  if (!video) {
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
                    <VideoPlayer src={video.videoUrl} videoRef={videoRef} />
                </div>
                <div className="lg:col-span-1 xl:col-span-1 h-full overflow-y-auto">
                    <SidePanel 
                        video={video} 
                        onTimecodeClick={handleTimecodeClick} 
                        currentTimeFormatted={formatTime(currentTime)}
                    />
                </div>
            </main>
        </div>
    </AppLayout>
  );
}
