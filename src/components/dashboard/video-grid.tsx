import VideoCard from './video-card';
import { Video } from '@/lib/types';
import { FolderKanban } from 'lucide-react';

interface VideoGridProps {
  videos: Video[];
}

export default function VideoGrid({ videos }: VideoGridProps) {
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
