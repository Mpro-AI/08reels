'use client';
import { useContext } from 'react';
import AppLayout, { AppLayoutContext } from '@/components/app-layout';
import Header from '@/components/header';
import VideoGrid from '@/components/dashboard/video-grid';
import { Skeleton } from '@/components/ui/skeleton';
import { Video } from '@/lib/types';

const MOCK_VIDEO: Video = {
  id: 'mock-video-1',
  title: '範例專案：城市夜景縮時攝影',
  thumbnailUrl: 'https://picsum.photos/seed/1/400/225',
  thumbnailHint: 'city night timelapse',
  author: {
    id: 'mock-user',
    name: '範例使用者'
  },
  uploadedAt: new Date().toISOString(),
  videoUrl: '',
  versions: [
    {
      id: 'v1',
      versionNumber: 1,
      status: 'approved',
      createdAt: new Date().toISOString(),
      uploader: { id: 'mock-user', name: '範例使用者' },
      comments: [],
      annotations: [],
      isCurrentActive: true,
      videoUrl: '',
    }
  ]
};


export default function DashboardPage() {
  const { videos, loading } = useContext(AppLayoutContext);

  const displayVideos = !loading && videos && videos.length === 0 ? [MOCK_VIDEO] : videos;

  return (
    <AppLayout>
      <div className="flex flex-1 flex-col">
        <Header title="專案影片" />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <VideoGrid videos={displayVideos ?? []} />
        </main>
      </div>
    </AppLayout>
  );
}
