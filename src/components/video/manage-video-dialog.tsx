'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { useFirestore } from '@/firebase';
import { Loader2, Users, Trash2 } from 'lucide-react';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useAuth } from '@/hooks/use-auth';
import { getAllUsers } from '@/firebase/firestore/users';

interface ManageVideoDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  video: Video;
  onVideoDeleted: (videoId: string) => void;
}

export function ManageVideoDialog({ isOpen, onOpenChange, video, onVideoDeleted }: ManageVideoDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(video.assignedUserIds || []);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: currentUser } = useAuth();
  
  const employees = allUsers.filter(u => u.role === 'employee' && u.id !== video.author.id);

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
    if (video) {
        setSelectedUserIds(video.assignedUserIds || []);
    }
  }, [video]);


  const handleClose = () => {
    if (isSubmitting) return;
    onOpenChange(false);
  };

  const handleSaveChanges = async () => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      await updateVideoAssignedUsers(firestore, video.id, selectedUserIds);
      toast({ title: '成功', description: '影片權限已更新。' });
      handleClose();
    } catch (error) {
      console.error('Failed to update permissions', error);
      toast({ variant: 'destructive', title: '更新失敗', description: '無法更新影片權限。' });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  const handleDeleteVideo = async () => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
        await deleteVideo(firestore, video.id);
        toast({ title: '成功', description: '影片專案已刪除。' });
        onVideoDeleted(video.id);
        handleClose();
    } catch (error) {
        console.error('Failed to delete video', error);
        toast({ variant: 'destructive', title: '刪除失敗', description: '無法刪除影片專案。' });
    } finally {
        setIsSubmitting(false);
    }
  }


  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUserIds(employees.map(e => e.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>管理專案: {video.title}</DialogTitle>
          <DialogDescription>
            編輯可查看此影片的員工，或刪除此專案。
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div className="space-y-2">
                <Label>可查看的用戶</Label>
                <p className="text-sm text-muted-foreground">選擇可以查看此影片的員工。若不選擇，則所有員工皆可查看。</p>
                {isLoadingUsers ? (
                <Skeleton className="h-24 w-full" />
                ) : (
                <div className='rounded-md border'>
                    <div className='flex items-center justify-between p-2 border-b'>
                        <Label className='flex items-center gap-2 font-normal text-sm'>
                            <Checkbox
                                checked={employees.length > 0 && selectedUserIds.length === employees.length}
                                onCheckedChange={handleSelectAll}
                                id="manage-select-all-users"
                            />
                            全選
                        </Label>
                        <span className="text-sm text-muted-foreground">{selectedUserIds.length} / {employees.length} 已選擇</span>
                    </div>
                    <ScrollArea className="h-48">
                    <div className="p-2 space-y-2">
                        {employees.map(employee => (
                        <div key={employee.id} className="flex items-center space-x-2">
                            <Checkbox
                            id={`manage-user-${employee.id}`}
                            checked={selectedUserIds.includes(employee.id)}
                            onCheckedChange={(checked) => {
                                setSelectedUserIds(prev => 
                                checked ? [...prev, employee.id] : prev.filter(id => id !== employee.id)
                                )
                            }}
                            />
                            <Label htmlFor={`manage-user-${employee.id}`} className="font-normal w-full">
                              {employee.name}
                            </Label>
                        </div>
                        ))}
                    </div>
                    </ScrollArea>
                </div>
                )}
            </div>
            <Separator />
            <div className="space-y-2">
                <Label className="text-destructive">危險區域</Label>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full justify-start gap-2" >
                            <Trash2 className="h-4 w-4"/> 刪除此影片專案
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>確定要刪除此專案嗎？</AlertDialogTitle>
                            <AlertDialogDescription>
                                這個操作無法復原。這將會把專案標記為已刪除，並從所有列表中隱藏。
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteVideo}>確定刪除</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
        <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>取消</Button>
            <Button onClick={handleSaveChanges} disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 儲存中</> : '儲存變更'}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
