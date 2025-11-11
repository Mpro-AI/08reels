'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Version, VersionStatus } from '@/lib/types';
import { GitBranch, Check, X, Edit, Upload, Star } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const statusMap: Record<VersionStatus, { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline', icon: React.ReactNode }> = {
    approved: { text: '已核可', variant: 'default', icon: <Check className="size-3" /> },
    pending_review: { text: '審核中', variant: 'secondary', icon: <GitBranch className="size-3" /> },
    needs_changes: { text: '要求修改', variant: 'outline', icon: <Edit className="size-3" /> },
    rejected: { text: '已拒絕', variant: 'destructive', icon: <X className="size-3" /> },
  };

interface VersionSectionProps {
    versions: Version[];
    selectedVersionId: string;
    onVersionChange: (versionId: string) => void;
}

export default function VersionSection({ versions, selectedVersionId, onVersionChange }: VersionSectionProps) {
    const { user } = useAuth();

  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle className="text-base">版本控制</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button className="w-full">
            <Upload className="mr-2 h-4 w-4"/>
            提交新版本
        </Button>
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
                                <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                                    <X className="mr-1 h-4 w-4"/>拒絕
                                </Button>
                                <Button size="sm" variant="outline">
                                    <Edit className="mr-1 h-4 w-4"/>修改
                                </Button>
                                <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                                    <Check className="mr-1 h-4 w-4"/>核可
                                </Button>
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
