import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Video, VersionStatus } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Clock, User, GitBranch } from 'lucide-react';

const statusMap: Record<VersionStatus, { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  approved: { text: '已核可', variant: 'default' },
  pending_review: { text: '審核中', variant: 'secondary' },
  needs_changes: { text: '要求修改', variant: 'outline' },
  rejected: { text: '已拒絕', variant: 'destructive' },
};

export default function VideoCard({ video }: { video: Video }) {
  const latestVersion = video.versions.length > 0 ? [...video.versions].sort((a, b) => b.versionNumber - a.versionNumber)[0] : null;
  const statusInfo = latestVersion ? statusMap[latestVersion.status] : null;

  return (
    <Card className="flex flex-col overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
      <Link href={`/videos/${video.id}`} className="block">
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
      <CardHeader className="flex-grow">
        <Link href={`/videos/${video.id}`} className="block">
          <CardTitle className="text-lg font-headline hover:text-primary">{video.title}</CardTitle>
        </Link>
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
            <User className="size-4"/>
            <span>作者：{video.author.name}</span>
         </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
            <Clock className="size-3"/>
            <span>上傳於 {formatDistanceToNow(new Date(video.uploadedAt), { addSuffix: true, locale: zhTW })}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
