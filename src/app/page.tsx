'use client';
import { useContext, useEffect } from 'react';
import { AppLayoutContext } from '@/components/app-layout';
import Header from '@/components/header';
import VideoGrid from '@/components/dashboard/video-grid';
import { Skeleton } from '@/components/ui/skeleton';
import { Video } from '@/lib/types';

export default function DashboardPage() {
  const { videos, loading, setVideos } = useContext(AppLayoutContext);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📄 Page - videos:', videos);
      console.log('📄 Page - loading:', loading);
    }
  }, [videos, loading]);

  const handleVideoDeleted = (videoId: string) => {
    if (videos) {
      setVideos(prevVideos => prevVideos!.filter(v => v.id !== videoId));
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <Header title="專案影片" />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <VideoGrid
          videos={videos ?? []}
          loading={loading}
          onVideoDeleted={handleVideoDeleted}
        />
      </main>
    </div>
  );
}
