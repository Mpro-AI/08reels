'use client';
import { useState, ReactNode } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Video } from '@/lib/types';
import { addVersionToVideo, addVideo } from '@/firebase/firestore/videos';
import { useFirestore } from '@/firebase';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  title: z.string().optional(),
  videoFile: z.instanceof(FileList).refine(files => files.length > 0, '請選擇一個影片檔案'),
});

type UploadVideoForm = z.infer<typeof formSchema>;

interface UploadVideoDialogProps {
  video?: Video; // If provided, it's a new version. Otherwise, it's a new video project.
  children: ReactNode;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function UploadVideoDialog({ video, children, isOpen, onOpenChange }: UploadVideoDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const firestore = useFirestore();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UploadVideoForm>({
    resolver: zodResolver(formSchema),
  });

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    onOpenChange(false);
  };
  
  const getFileDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
  }

  const onSubmit = async (data: UploadVideoForm) => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: '錯誤', description: '使用者未登入或資料庫連線失敗' });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
        const videoFile = data.videoFile[0];
        const videoDataUri = await getFileDataUri(videoFile);

        if (video) {
            // Add new version to existing video
            await addVersionToVideo(firestore, video.id, videoDataUri, user);
            toast({ title: '成功', description: '新版本已成功提交。' });
        } else {
            // Create a new video project
            if (!data.title) {
                toast({ variant: 'destructive', title: '錯誤', description: '請提供影片標題。' });
                setIsSubmitting(false);
                return;
            }
            // For a new video, we need a placeholder thumbnail. Let's just use a static one for now.
            const newVideoData = {
                title: data.title,
                videoDataUri: videoDataUri,
                assignedTo: user, // Or some other logic for assignment
            };
            await addVideo(firestore, newVideoData, user);
            toast({ title: '成功', description: '新影片專案已成功建立。' });
        }
        handleClose();

    } catch (error) {
        console.error('Upload failed', error);
        toast({ variant: 'destructive', title: '上傳失敗', description: '處理您的請求時發生錯誤。' });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      {children}
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{video ? `提交新版本至 "${video.title}"` : '上傳新專案影片'}</DialogTitle>
            <DialogDescription>
              {video ? '請選擇要上傳的新版本影片檔案。' : '請提供影片標題並選擇影片檔案來建立一個新的專案。'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {!video && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  標題
                </Label>
                <div className="col-span-3">
                  <Input id="title" {...register('title')} className="w-full" />
                  {errors.title && <p className="text-destructive text-sm mt-1">{errors.title.message}</p>}
                </div>
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="video-file" className="text-right">
                影片檔案
              </Label>
              <div className="col-span-3">
                <Input id="video-file" type="file" accept="video/*" {...register('videoFile')} />
                {errors.videoFile && <p className="text-destructive text-sm mt-1">{errors.videoFile.message}</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>取消</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 處理中...</> : '提交'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}