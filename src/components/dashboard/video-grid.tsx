import { useState } from 'react';
import VideoCard from './video-card';
import { Video } from '@/lib/types';
import { FolderKanban, CheckSquare, X } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '../ui/button';
import { useAuth } from '@/hooks/use-auth';
import { BatchManageDialog } from '../video/batch-manage-dialog';

interface VideoGridProps {
  videos: Video[];
  loading?: boolean;
  onVideoDeleted: (videoId: string) => void;
}

export default function VideoGrid({ videos, loading = false, onVideoDeleted }: VideoGridProps) {
  const { user } = useAuth();
  const [batchMode, setBatchMode] = useState(false);
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [showBatchDialog, setShowBatchDialog] = useState(false);

  const isAdmin = user?.role === 'admin';

  const handleToggleBatchMode = () => {
    setBatchMode(!batchMode);
    setSelectedVideoIds(new Set());
  };

  const handleVideoSelect = (videoId: string, selected: boolean) => {
    setSelectedVideoIds(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(videoId);
      } else {
        newSet.delete(videoId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedVideoIds.size === videos.length) {
      setSelectedVideoIds(new Set());
    } else {
      setSelectedVideoIds(new Set(videos.map(v => v.id)));
    }
  };

  const handleBatchComplete = (deletedIds?: string[]) => {
    setBatchMode(false);
    setSelectedVideoIds(new Set());
    setShowBatchDialog(false);

    if (deletedIds && deletedIds.length > 0) {
      deletedIds.forEach(id => onVideoDeleted(id));
    }
  };

  const selectedVideos = videos.filter(v => selectedVideoIds.has(v.id));

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
    <div className="space-y-4">
      {/* 批次操作工具列 */}
      {isAdmin && (
        <div className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            {!batchMode ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleBatchMode}
              >
                <CheckSquare className="mr-2 h-4 w-4" />
                批次管理
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleBatchMode}
                >
                  <X className="mr-2 h-4 w-4" />
                  取消
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedVideoIds.size === videos.length ? '取消全選' : '全選'}
                </Button>
                <span className="text-sm text-muted-foreground">
                  已選擇 {selectedVideoIds.size} 個專案
                </span>
              </>
            )}
          </div>
          {batchMode && selectedVideoIds.size > 0 && (
            <Button
              size="sm"
              onClick={() => setShowBatchDialog(true)}
            >
              管理選中的專案
            </Button>
          )}
        </div>
      )}

      {/* 影片網格 */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <AnimatePresence>
          {videos.map((video) => (
            <motion.div
              key={video.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
            >
              <VideoCard
                video={video}
                onVideoDeleted={onVideoDeleted}
                batchMode={batchMode}
                isSelected={selectedVideoIds.has(video.id)}
                onSelect={(selected) => handleVideoSelect(video.id, selected)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 批次管理對話框 */}
      {showBatchDialog && (
        <BatchManageDialog
          isOpen={showBatchDialog}
          onOpenChange={setShowBatchDialog}
          selectedVideos={selectedVideos}
          onBatchComplete={handleBatchComplete}
        />
      )}
    </div>
  );
}
