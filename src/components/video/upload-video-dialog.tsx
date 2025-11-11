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
import { uploadVideoAndGetUrl } from '@/firebase/storage';
import { useStorage } from '@/firebase';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '../ui/textarea';

const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB
const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/x-msvideo"];

const formSchema = z.object({
  title: z.string().optional(),
  notes: z.string().optional(),
  videoFile: z.instanceof(FileList)
    .refine(files => files?.length > 0, '請選擇一個影片檔案')
    .refine(files => files?.[0]?.size <= MAX_FILE_SIZE, `檔案大小不能超過 1GB。`)
    .refine(
      files => ACCEPTED_VIDEO_TYPES.includes(files?.[0]?.type),
      "不支援的檔案格式，僅支援 MP4 / MOV / AVI。"
    ),
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();
  const firestore = useFirestore();
  const storage = useStorage();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UploadVideoForm>({
    resolver: zodResolver(formSchema),
  });

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    setUploadProgress(0);
    onOpenChange(false);
  };

  const onSubmit = async (data: UploadVideoForm) => {
    if (!user || !firestore || !storage) {
      toast({ variant: 'destructive', title: '錯誤', description: '使用者未登入或服務連線失敗' });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
        const videoFile = data.videoFile[0];

        const videoUrl = await uploadVideoAndGetUrl(
          storage, 
          videoFile, 
          setUploadProgress,
          video?.id
        );

        if (video) {
            // Add new version to existing video
            await addVersionToVideo(firestore, video.id, videoUrl, { id: user.id, name: user.name }, data.notes);
            toast({ title: '成功', description: '新版本已成功提交。' });
        } else {
            // Create a new video project
            if (!data.title) {
                toast({ variant: 'destructive', title: '錯誤', description: '請提供影片標題。' });
                setIsSubmitting(false);
                return;
            }
            const newVideoData = {
                title: data.title,
                videoUrl: videoUrl,
                assignedTo: { id: user.id, name: user.name }, // Or some other logic for assignment
                notes: data.notes,
            };
            await addVideo(firestore, newVideoData, { id: user.id, name: user.name });
            toast({ title: '成功', description: '新影片專案已成功建立。' });
        }
        handleClose();

    } catch (error) {
        console.error('Upload failed', error);
        toast({ variant: 'destructive', title: '上傳失敗', description: '處理您的請求時發生錯誤。' });
    } finally {
        setIsSubmitting(false);
        setUploadProgress(0);
    }
  };
  
  const isUploading = isSubmitting && uploadProgress > 0 && uploadProgress < 100;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      {children}
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{video ? `提交新版本至 "${video.title}"` : '上傳新專案影片'}</DialogTitle>
            <DialogDescription>
              {video ? '請選擇要上傳的新版本影片檔案，並可選填版本備註。' : '請提供影片標題並選擇影片檔案來建立一個新的專案。'}
              <br/>
              <span className="text-xs text-muted-foreground">僅支援 MP4 / MOV / AVI，單檔上限：1GB。</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {!video && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  標題
                </Label>
                <div className="col-span-3">
                  <Input id="title" {...register('title')} className="w-full" disabled={isSubmitting}/>
                  {errors.title && <p className="text-destructive text-sm mt-1">{errors.title.message}</p>}
                </div>
              </div>
            )}
            <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="notes" className="text-right pt-2">
                  備註
                </Label>
                <div className="col-span-3">
                  <Textarea id="notes" {...register('notes')} placeholder="（選填）本次修改重點：燈光與字幕校正" className="w-full" disabled={isSubmitting}/>
                  {errors.notes && <p className="text-destructive text-sm mt-1">{errors.notes.message}</p>}
                </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="video-file" className="text-right">
                影片檔案
              </Label>
              <div className="col-span-3">
                <Input id="video-file" type="file" accept="video/mp4,video/quicktime,video/x-msvideo" {...register('videoFile')} disabled={isSubmitting}/>
                {errors.videoFile && <p className="text-destructive text-sm mt-1">{errors.videoFile.message?.toString()}</p>}
              </div>
            </div>
            {isSubmitting && (
                <div className="col-span-4 space-y-2">
                    <Label>{isUploading ? `上傳中... ${uploadProgress.toFixed(0)}%` : (uploadProgress === 100 ? '上傳完成，處理中...' : '準備上傳...')}</Label>
                    <Progress value={uploadProgress} />
                </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>取消</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {isUploading ? '上傳中' : '處理中'}</> : '提交'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
