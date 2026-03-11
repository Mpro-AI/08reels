import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Video, VersionStatus, User } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Clock, User as UserIcon, GitBranch, Users, MoreVertical, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { useState } from 'react';
import { ManageVideoDialog } from '../video/manage-video-dialog';
import { Checkbox } from '../ui/checkbox';

const statusMap: Record<VersionStatus, { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  approved: { text: '已核可', variant: 'default' },
  pending_review: { text: '審核中', variant: 'secondary' },
  needs_changes: { text: '要求修改', variant: 'outline' },
  rejected: { text: '已拒絕', variant: 'destructive' },
};

interface VideoCardProps {
  video: Video;
  onVideoDeleted: (videoId: string) => void;
  batchMode?: boolean;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
}

export default function VideoCard({
  video,
  onVideoDeleted,
  batchMode = false,
  isSelected = false,
  onSelect
}: VideoCardProps) {
  const { user } = useAuth();
  const [showManageDialog, setShowManageDialog] = useState(false);
  const latestVersion = video.versions.length > 0 ? [...video.versions].sort((a, b) => b.versionNumber - a.versionNumber)[0] : null;
  const statusInfo = latestVersion ? statusMap[latestVersion.status] : null;

  const canManage = user?.role === 'admin' || user?.id === video.author.id;
  const hasAssignedUsers = video.assignedUserIds && video.assignedUserIds.length > 0;
  const assignedCount = video.assignedUserIds?.length || 0;

  const handleDeleted = (videoId: string) => {
    onVideoDeleted(videoId);
    setShowManageDialog(false);
  }

  const handleCardClick = (e: React.MouseEvent) => {
    if (batchMode && onSelect) {
      e.preventDefault();
      onSelect(!isSelected);
    }
  };

  return (
    <>
      <Card
        className={`flex flex-col overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 relative group ${
          batchMode ? 'cursor-pointer' : ''
        } ${isSelected ? 'ring-2 ring-primary' : ''}`}
        onClick={handleCardClick}
      >
        {/* 批次選擇模式下的複選框 */}
        {batchMode && (
          <div
            className="absolute top-2 left-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect?.(checked as boolean)}
              className="h-6 w-6 bg-white border-2 shadow-lg"
            />
          </div>
        )}

        <Link
          href={`/videos/${video.id}`}
          className="block"
          onClick={(e) => batchMode && e.preventDefault()}
        >
          <div className="aspect-video overflow-hidden">
            <Image
              src={video.thumbnailUrl}
              alt={video.title}
              width={400}
              height={225}
              className="object-cover w-full h-full transition-transform duration-300 hover:scale-105"
              data-ai-hint={video.thumbnailHint}
            />
          </div>
        </Link>

        {hasAssignedUsers && !batchMode && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
            <Users className="h-3 w-3" />
            <span>{assignedCount}</span>
          </div>
        )}
        
        <CardHeader className="flex-grow">
          <div className='flex items-start justify-between gap-2'>
            <Link
              href={`/videos/${video.id}`}
              className="block flex-1"
              onClick={(e) => batchMode && e.preventDefault()}
            >
              <CardTitle className="text-lg font-headline hover:text-primary">{video.title}</CardTitle>
            </Link>
            {canManage && !batchMode && (
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowManageDialog(true)}>
                      <Settings className="mr-2 h-4 w-4" />
                      管理專案
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            )}
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
           {latestVersion && statusInfo && (
              <div className="flex items-center gap-2">
                <GitBranch className="size-4"/> 
                <span>最新版本 v{latestVersion.versionNumber.toString().padStart(2, '0')}</span>
                <Badge variant={statusInfo.variant} className="ml-auto">{statusInfo.text}</Badge>
              </div>
           )}
           <div className="flex items-center gap-2">
              <UserIcon className="size-4"/>
              <span>作者：{video.author.name}</span>
           </div>
           {hasAssignedUsers && (
             <div className="flex items-center gap-2">
                <Users className="size-4"/>
                <span>指派給 {assignedCount} 位用戶</span>
             </div>
           )}
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
              <Clock className="size-3"/>
              <span>上傳於 {formatDistanceToNow(new Date(video.uploadedAt), { addSuffix: true, locale: zhTW })}</span>
          </div>
        </CardFooter>
      </Card>
      {canManage && (
        <ManageVideoDialog 
          isOpen={showManageDialog}
          onOpenChange={setShowManageDialog}
          video={video}
          onVideoDeleted={handleDeleted}
        />
      )}
    </>
  );
}
