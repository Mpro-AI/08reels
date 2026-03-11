'use client';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useStorage } from '@/firebase';
import { Loader2, Users, Trash2, AlertTriangle } from 'lucide-react';
import { User, Video } from '@/lib/types';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { updateVideoAssignedUsers, deleteVideo } from '@/firebase/firestore/videos';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { getAllUsers } from '@/firebase/firestore/users';
import { Skeleton } from '../ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/use-auth';

interface BatchManageDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  selectedVideos: Video[];
  onBatchComplete: (deletedIds?: string[]) => void;
}

export function BatchManageDialog({
  isOpen,
  onOpenChange,
  selectedVideos,
  onBatchComplete
}: BatchManageDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingInProgress, setIsDeletingInProgress] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const storage = useStorage();
  const { user: currentUser } = useAuth();

  const employees = allUsers.filter(u => u.role === 'employee');

  // Check which videos the current user can delete
  const { canDeleteVideos, cannotDeleteVideos } = useMemo(() => {
    if (!currentUser) return { canDeleteVideos: [], cannotDeleteVideos: selectedVideos };

    const isAdmin = currentUser.role === 'admin';
    const canDelete: Video[] = [];
    const cannotDelete: Video[] = [];

    selectedVideos.forEach(video => {
      if (isAdmin || video.author.id === currentUser.id) {
        canDelete.push(video);
      } else {
        cannotDelete.push(video);
      }
    });

    return { canDeleteVideos: canDelete, cannotDeleteVideos: cannotDelete };
  }, [currentUser, selectedVideos]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (isOpen && firestore) {
        setIsLoadingUsers(true);
        try {
          const userList = await getAllUsers(firestore);
          setAllUsers(userList);
        } catch (error) {
          console.error("Failed to fetch users:", error);
          toast({ variant: 'destructive', title: '無法載入用戶列表' });
        } finally {
          setIsLoadingUsers(false);
        }
      }
    };
    fetchUsers();
  }, [isOpen, firestore, toast]);

  useEffect(() => {
    if (isOpen) {
      setSelectedUserIds([]);
      setDeleteProgress(0);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (isSubmitting || isDeleting) return;
    onOpenChange(false);
  };

  const handleBatchAssignUsers = async () => {
    if (!firestore) return;
    setIsSubmitting(true);

    try {
      const updatePromises = selectedVideos.map(video =>
        updateVideoAssignedUsers(firestore, video.id, selectedUserIds)
      );

      await Promise.all(updatePromises);

      toast({
        title: '成功',
        description: `已更新 ${selectedVideos.length} 個專案的權限。`
      });

      onBatchComplete();
      handleClose();
    } catch (error) {
      console.error('Failed to batch update permissions', error);
      toast({
        variant: 'destructive',
        title: '批次更新失敗',
        description: '無法更新專案權限。'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchDelete = async () => {
    console.log('🔴 handleBatchDelete called');
    console.log('🔴 firestore:', !!firestore, 'storage:', !!storage);
    console.log('🔴 canDeleteVideos:', canDeleteVideos.length);
    console.log('🔴 currentUser:', currentUser);

    if (!firestore || !storage) {
      console.error('❌ Firestore or Storage not available');
      toast({
        variant: 'destructive',
        title: '錯誤',
        description: 'Firebase 服務未就緒，請重新整理頁面。'
      });
      return;
    }

    if (canDeleteVideos.length === 0) {
      console.error('❌ No videos to delete');
      toast({
        variant: 'destructive',
        title: '無法刪除',
        description: '沒有可以刪除的專案。'
      });
      return;
    }

    setIsDeleting(true);
    setDeleteProgress(0);
    setShowDeleteConfirm(false);

    try {
      // Only delete videos the user has permission for
      const totalVideos = canDeleteVideos.length;
      const deletedIds: string[] = [];
      console.log(`🔴 Starting to delete ${totalVideos} videos`);

      for (let i = 0; i < canDeleteVideos.length; i++) {
        const video = canDeleteVideos[i];
        console.log(`🔴 Deleting video ${i + 1}/${totalVideos}: ${video.title} (${video.id})`);
        try {
          await deleteVideo(firestore, storage, video.id);
          deletedIds.push(video.id);
          setDeleteProgress(((i + 1) / totalVideos) * 100);
          console.log(`✅ Successfully deleted: ${video.title}`);
        } catch (error) {
          console.error(`❌ Failed to delete video ${video.id}:`, error);
          toast({
            variant: 'destructive',
            title: `刪除失敗: ${video.title}`,
            description: '無法刪除此專案,已跳過。',
          });
        }
      }

      console.log(`🔴 Deletion complete. Deleted ${deletedIds.length}/${totalVideos} videos`);

      let description = `已成功刪除 ${deletedIds.length} 個專案。`;
      if (cannotDeleteVideos.length > 0) {
        description += ` ${cannotDeleteVideos.length} 個專案因權限不足已跳過。`;
      }

      toast({
        title: '批次刪除完成',
        description
      });

      onBatchComplete(deletedIds);
      handleClose();
    } catch (error) {
      console.error('Batch delete failed', error);
      toast({
        variant: 'destructive',
        title: '批次刪除失敗',
        description: '處理過程中發生錯誤。'
      });
    } finally {
      setIsDeleting(false);
      setDeleteProgress(0);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUserIds(employees.map(e => e.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>批次管理專案 [DEBUG v2.0]</DialogTitle>
            <DialogDescription>
              已選擇 {selectedVideos.length} 個專案 | 可刪除: {canDeleteVideos.length} | 無權限: {cannotDeleteVideos.length}
            </DialogDescription>
          </DialogHeader>

          {isDeleting ? (
            <div className="py-8 space-y-4">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  正在刪除專案... {deleteProgress.toFixed(0)}%
                </p>
              </div>
              <Progress value={deleteProgress} />
            </div>
          ) : (
            <Tabs defaultValue="assign" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="assign">指派用戶</TabsTrigger>
                <TabsTrigger value="delete">刪除專案</TabsTrigger>
              </TabsList>

              <TabsContent value="assign" className="space-y-4">
                <div className="space-y-2">
                  <Label>選擇可查看的用戶</Label>
                  <p className="text-sm text-muted-foreground">
                    這些用戶將可以查看所有選中的專案。若不選擇，則所有員工皆可查看。
                  </p>
                  {isLoadingUsers ? (
                    <Skeleton className="h-48 w-full" />
                  ) : (
                    <div className='rounded-md border'>
                      <div className='flex items-center justify-between p-2 border-b bg-muted/50'>
                        <Label className='flex items-center gap-2 font-normal text-sm m-0'>
                          <Checkbox
                            checked={employees.length > 0 && selectedUserIds.length === employees.length}
                            onCheckedChange={handleSelectAll}
                            id="batch-select-all-users"
                          />
                          全選
                        </Label>
                        <span className="text-sm text-muted-foreground">
                          {selectedUserIds.length} / {employees.length} 已選擇
                        </span>
                      </div>
                      <ScrollArea className="h-48">
                        <div className="p-2 space-y-2">
                          {employees.map(employee => (
                            <div key={employee.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`batch-user-${employee.id}`}
                                checked={selectedUserIds.includes(employee.id)}
                                onCheckedChange={(checked) => {
                                  setSelectedUserIds(prev =>
                                    checked ? [...prev, employee.id] : prev.filter(id => id !== employee.id)
                                  )
                                }}
                              />
                              <Label
                                htmlFor={`batch-user-${employee.id}`}
                                className="font-normal w-full cursor-pointer"
                              >
                                {employee.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleClose}
                    disabled={isSubmitting}
                  >
                    取消
                  </Button>
                  <Button onClick={handleBatchAssignUsers} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        更新中
                      </>
                    ) : (
                      <>
                        <Users className="mr-2 h-4 w-4" />
                        批次指派
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="delete" className="space-y-4">
                {!showDeleteConfirm ? (
                  <>
                    <div className="space-y-2">
                      <Label className="text-destructive">危險操作</Label>

                      {cannotDeleteVideos.length > 0 && (
                        <div className="p-4 border border-yellow-500/50 rounded-lg bg-yellow-500/5 mb-4">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-2">
                                權限不足警告
                              </p>
                              <p className="text-sm text-muted-foreground mb-2">
                                以下 <span className="font-bold">{cannotDeleteVideos.length}</span> 個專案無法刪除（只有管理員或作者可以刪除專案）：
                              </p>
                              <ScrollArea className="h-20 mb-2">
                                <ul className="text-sm space-y-1">
                                  {cannotDeleteVideos.map(video => (
                                    <li key={video.id} className="text-muted-foreground">
                                      • {video.title} <span className="text-xs">(作者: {video.author.name})</span>
                                    </li>
                                  ))}
                                </ul>
                              </ScrollArea>
                            </div>
                          </div>
                        </div>
                      )}

                      {canDeleteVideos.length > 0 && (
                        <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/5">
                          <p className="text-sm text-muted-foreground mb-4">
                            您即將刪除 <span className="font-bold text-destructive">{canDeleteVideos.length}</span> 個專案：
                          </p>
                          <ScrollArea className="h-32 mb-4">
                            <ul className="text-sm space-y-1">
                              {canDeleteVideos.map(video => (
                                <li key={video.id} className="text-muted-foreground">
                                  • {video.title}
                                </li>
                              ))}
                            </ul>
                          </ScrollArea>
                          <p className="text-sm text-destructive font-medium">
                            此操作無法復原！所有版本、留言、註解都將被永久刪除。
                          </p>
                        </div>
                      )}

                      {canDeleteVideos.length === 0 && (
                        <div className="p-4 border border-muted rounded-lg bg-muted/20">
                          <p className="text-sm text-muted-foreground text-center">
                            您沒有權限刪除任何選中的專案。
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleClose}
                      >
                        取消
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          console.log('🔵 Showing delete confirmation');
                          setShowDeleteConfirm(true);
                        }}
                        disabled={canDeleteVideos.length === 0}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        批次刪除 {canDeleteVideos.length > 0 && `(${canDeleteVideos.length})`}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-4">
                      <div className="p-6 border-2 border-destructive rounded-lg bg-destructive/10">
                        <div className="flex items-start gap-3 mb-4">
                          <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0 mt-1" />
                          <div>
                            <h3 className="font-bold text-lg text-destructive mb-2">最後確認</h3>
                            <p className="text-sm mb-3">
                              確定要永久刪除 <span className="font-bold text-destructive">{canDeleteVideos.length}</span> 個專案嗎？
                            </p>
                            <p className="text-sm text-muted-foreground mb-2">
                              這將刪除：
                            </p>
                            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 mb-3">
                              <li>所有版本的影片檔案</li>
                              <li>所有留言和註解</li>
                              <li>所有相關資料</li>
                            </ul>
                            <p className="text-sm font-bold text-destructive">
                              ⚠️ 此操作無法復原！
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          console.log('🔵 Delete cancelled');
                          setShowDeleteConfirm(false);
                        }}
                        disabled={isDeleting}
                      >
                        取消
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={async () => {
                          console.log('🔵 CONFIRM DELETE CLICKED - Starting batch delete');
                          await handleBatchDelete();
                        }}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            刪除中...
                          </>
                        ) : (
                          <>
                            <Trash2 className="mr-2 h-4 w-4" />
                            確定刪除 ({canDeleteVideos.length})
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
