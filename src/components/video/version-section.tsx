'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Version, VersionStatus, Video } from '@/lib/types';
import { GitBranch, Check, X, Edit, Upload, Star } from 'lucide-react';
import { useAuth as useAppAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { UploadVideoDialog } from './upload-video-dialog';

const statusMap: Record<VersionStatus, { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline', icon: React.ReactNode }> = {
    approved: { text: '已核可', variant: 'default', icon: <Check className="size-3" /> },
    pending_review: { text: '審核中', variant: 'secondary', icon: <GitBranch className="size-3" /> },
    needs_changes: { text: '要求修改', variant: 'outline', icon: <Edit className="size-3" /> },
    rejected: { text: '已拒絕', variant: 'destructive', icon: <X className="size-3" /> },
  };

interface VersionSectionProps {
    video: Video;
    versions: Version[];
    selectedVersionId: string;
    onVersionChange: (versionId: string) => void;
    onStatusChange: (versionId: string, status: VersionStatus) => void;
}

const StatusButton = ({
  versionId,
  status,
  onStatusChange,
  children,
  className,
  dialogTitle,
  dialogDescription
}: {
  versionId: string;
  status: VersionStatus;
  onStatusChange: (versionId: string, status: VersionStatus) => void;
  children: React.ReactNode;
  className?: string;
  dialogTitle: string;
  dialogDescription: string;
}) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button size="sm" variant="outline" className={cn(className, "w-full")}>
        {children}
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
        <AlertDialogDescription>{dialogDescription}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>取消</AlertDialogCancel>
        <AlertDialogAction onClick={() => onStatusChange(versionId, status)}>
          確定
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)


export default function VersionSection({ video, versions, selectedVersionId, onVersionChange, onStatusChange }: VersionSectionProps) {
    const { user } = useAppAuth();
    const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle className="text-base">版本控制</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <UploadVideoDialog 
            isOpen={isUploadOpen} 
            onOpenChange={setIsUploadOpen}
            video={video}
        >
            <Button className="w-full" onClick={() => setIsUploadOpen(true)}>
                <Upload className="mr-2 h-4 w-4"/>
                提交新版本
            </Button>
        </UploadVideoDialog>

        <div className="space-y-3 max-h-[calc(100vh-22rem)] overflow-y-auto pr-2">
            {versions.sort((a,b) => b.versionNumber - a.versionNumber).map(version => {
                const statusInfo = statusMap[version.status];
                const isSelected = version.id === selectedVersionId;
                return (
                    <div 
                        key={version.id} 
                        className={cn(
                            "rounded-lg border bg-card p-3 space-y-3 cursor-pointer transition-colors",
                            isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                        )}
                        onClick={() => onVersionChange(version.id)}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <p className="font-semibold">v{version.versionNumber.toString().padStart(2, '0')}</p>
                                {version.isCurrentActive && (
                                    <Badge variant="secondary" className="gap-1 text-yellow-600 border-yellow-500/50">
                                        <Star className="size-3 fill-current" />
                                        正式
                                    </Badge>
                                )}
                            </div>
                            <Badge variant={statusInfo.variant} className="gap-1.5">
                                {statusInfo.icon}
                                {statusInfo.text}
                            </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                            <p>上傳者：{version.uploader.name}</p>
                            <p>時間：{format(new Date(version.createdAt), 'yyyy-MM-dd HH:mm')}</p>
                        </div>
                        {user?.role === 'admin' && version.status === 'pending_review' && (
                            <div className="grid grid-cols-3 gap-2 pt-2">
                                <StatusButton
                                  versionId={version.id}
                                  status="rejected"
                                  onStatusChange={onStatusChange}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/50"
                                  dialogTitle="確定要拒絕此版本嗎？"
                                  dialogDescription="此操作無法復原。這將會將此版本標記為「已拒絕」。"
                                >
                                  <X className="mr-1 h-4 w-4"/>拒絕
                                </StatusButton>
                               <StatusButton
                                  versionId={version.id}
                                  status="needs_changes"
                                  onStatusChange={onStatusChange}
                                  dialogTitle="確定要發出修改要求嗎？"
                                  dialogDescription="這將會將此版本標記為「要求修改」。請記得在評論中說明需要修改的內容。"
                                >
                                  <Edit className="mr-1 h-4 w-4"/>修改
                                </StatusButton>
                               <StatusButton
                                  versionId={version.id}
                                  status="approved"
                                  onStatusChange={onStatusChange}
                                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                                  dialogTitle="確定要核可此版本嗎？"
                                  dialogDescription="此版本將會被標記為「已核可」並設定為「正式版本」。"
                                >
                                  <Check className="mr-1 h-4 w-4"/>核可
                                </StatusButton>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
      </CardContent>
    </Card>
  );
}
