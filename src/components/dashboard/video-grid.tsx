import VideoCard from './video-card';
import { Video } from '@/lib/types';
import { FolderKanban } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

interface VideoGridProps {
  videos: Video[];
  loading?: boolean;
}

export default function VideoGrid({ videos, loading = false }: VideoGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-48 w-full rounded-lg" />
            <div className='p-2 space-y-2'>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-full py-16 text-center text-muted-foreground">
            <FolderKanban className="size-16 mb-4" />
            <h3 className="text-xl font-semibold">尚未有任何專案</h3>
            <p className="mt-2 text-sm">點擊右上角的「上傳影片」來建立您的第一個專案。</p>
        </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
}
