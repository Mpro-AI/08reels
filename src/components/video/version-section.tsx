'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Version, VersionStatus, Video, Comment } from '@/lib/types';
import { GitBranch, Check, X, Edit, Upload, Star, StickyNote, Plus, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { UploadNewVersionDialog } from './upload-new-version-dialog';

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
    onNewVersionUploaded?: () => void;
    onCommentClick?: (timecode: number) => void;
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

// 評論顯示組件
const CommentsDisplay = ({ 
  comments, 
  onCommentClick 
}: { 
  comments: Comment[], 
  onCommentClick?: (timecode: number) => void 
}) => {
  if (comments.length === 0) {
    return (
      <div className="text-center py-3 text-muted-foreground text-xs">
        <MessageSquare className="mx-auto h-6 w-6 mb-1 opacity-50" />
        <p>此版本無評論</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[200px] overflow-y-auto">
      {comments
        .sort((a, b) => a.timecode - b.timecode)
        .map(comment => (
          <div 
            key={comment.id} 
            className="text-xs p-2 rounded-md bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => onCommentClick?.(comment.timecode)}
          >
            <div className="flex items-start justify-between mb-1">
              <p className="font-medium text-foreground">{comment.author.name}</p>
              <p className="text-primary font-mono">{comment.timecodeFormatted}</p>
            </div>
            <p className="text-muted-foreground whitespace-pre-wrap">{comment.text}</p>
          </div>
        ))}
    </div>
  );
};

export default function VersionSection({ 
    video, 
    versions, 
    selectedVersionId, 
    onVersionChange, 
    onStatusChange,
    onNewVersionUploaded,
    onCommentClick
}: VersionSectionProps) {
    const { user } = useAuth();
    const isOwner = user?.id === video.author.id;
    const isAdmin = user?.role === 'admin';
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());

    const maxVersionNumber = Math.max(...versions.map(v => v.versionNumber));

    const toggleVersionExpansion = (versionId: string) => {
      setExpandedVersions(prev => {
        const newSet = new Set(prev);
        if (newSet.has(versionId)) {
          newSet.delete(versionId);
        } else {
          newSet.add(versionId);
        }
        return newSet;
      });
    };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between">
            <CardTitle className="text-base">版本控制</CardTitle>
            <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => setShowUploadDialog(true)}
            >
                <Plus className="h-4 w-4" />
                上傳新版本
            </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 max-h-[calc(100vh-22rem)] overflow-y-auto pr-2">
            {versions.sort((a,b) => b.versionNumber - a.versionNumber).map(version => {
                const statusInfo = statusMap[version.status];
                const isSelected = version.id === selectedVersionId;
                const isExpanded = expandedVersions.has(version.id);
                const hasComments = version.comments && version.comments.length > 0;
                
                return (
                    <div 
                        key={version.id} 
                        className={cn(
                            "rounded-lg border bg-card space-y-3 transition-colors",
                            isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                        )}
                    >
                        {/* 版本主要資訊區域 - 可點擊切換版本 */}
                        <div 
                            className="p-3 space-y-3 cursor-pointer"
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
                            {version.notes && (
                                <div className="text-sm text-foreground bg-muted/50 p-2 rounded-md flex items-start gap-2">
                                    <StickyNote className="size-4 mt-0.5 shrink-0" />
                                    <p className="whitespace-pre-wrap">{version.notes}</p>
                                </div>
                            )}
                            
                            {/* 管理員操作按鈕 */}
                            {isOwner && version.status === 'pending_review' && (
                                <div className="grid grid-cols-3 gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
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

                        {/* 評論區域 - 只有管理員可以看到和展開/折疊 */}
                        {isAdmin && hasComments && (
                            <Collapsible 
                              open={isExpanded} 
                              onOpenChange={() => toggleVersionExpansion(version.id)}
                            >
                              <div className="border-t">
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-between px-3 py-2 h-auto rounded-none hover:bg-muted/50"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex items-center gap-2 text-xs">
                                      <MessageSquare className="h-3.5 w-3.5" />
                                      <span>歷史評論 ({version.comments.length})</span>
                                    </div>
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="px-3 pb-3 pt-2">
                                    <CommentsDisplay 
                                      comments={version.comments} 
                                      onCommentClick={onCommentClick}
                                    />
                                  </div>
                                </CollapsibleContent>
                              </div>
                            </Collapsible>
                        )}
                    </div>
                )
            })}
        </div>
      </CardContent>
       <UploadNewVersionDialog
        isOpen={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        videoId={video.id}
        currentVersionNumber={maxVersionNumber}
        onSuccess={() => {
          onNewVersionUploaded?.();
        }}
      />
    </Card>
  );
}