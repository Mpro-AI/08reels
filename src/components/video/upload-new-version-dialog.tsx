'use client';
import { useSupabase } from '@/supabase';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Loader2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

import { uploadVideoAndGetUrl } from '@/supabase/storage';
import { addNewVersion } from '@/supabase/db/videos';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB
const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/avi", "video/webm"];

const formSchema = z.object({
  notes: z.string().optional(),
  videoFile: z
    .instanceof(FileList)
    .refine((files) => files?.length > 0, '請選擇一個影片檔案')
    .refine(
      (files) => files?.[0]?.size <= MAX_FILE_SIZE,
      `檔案大小不能超過 1GB。`
    )
    .refine(
      (files) => ACCEPTED_VIDEO_TYPES.includes(files?.[0]?.type),
      "不支援的檔案格式，僅支援 MP4, MOV, AVI, WEBM。"
    ),
});

type UploadNewVersionForm = z.infer<typeof formSchema>;

interface UploadNewVersionDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  videoId: string;
  currentVersionNumber: number;
  onSuccess?: () => void;
}

export function UploadNewVersionDialog({
  isOpen,
  onOpenChange,
  videoId,
  currentVersionNumber,
  onSuccess,
}: UploadNewVersionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { toast } = useToast();
  const { user } = useAuth();
  const supabase = useSupabase();
  

  const form = useForm<UploadNewVersionForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notes: '',
      videoFile: undefined,
    },
  });

  useEffect(() => {
    if(isOpen) {
      form.reset();
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  }, [isOpen, form]);


  const onSubmit = async (data: UploadNewVersionForm) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: '錯誤',
        description: '使用者未登入或服務連線失敗',
      });
      return;
    }

    setIsSubmitting(true);
    const newVersionNumber = currentVersionNumber + 1;

    try {
      const videoFile = data.videoFile[0];

      // We only need the video URL, thumbnail is already set for the project.
      const { videoUrl, thumbnailUrl } = await uploadVideoAndGetUrl(supabase,
        videoFile,
        setUploadProgress,
        videoId,
        newVersionNumber
      );

      await addNewVersion(supabase,
        videoId,
        {
          videoUrl: videoUrl,
          thumbnailUrl: thumbnailUrl,
          notes: data.notes,
        },
        { id: user.id, name: user.name }
      );

      toast({
        title: '成功',
        description: `新版本 v${newVersionNumber} 已上傳成功`,
      });
      
      onSuccess?.();
      handleClose();

    } catch (error) {
      console.error('Upload failed', error);
      toast({
        variant: 'destructive',
        title: '上傳失敗',
        description: '處理您的請求時發生錯誤',
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onOpenChange(false);
  };
  
  const isUploading = isSubmitting && uploadProgress > 0 && uploadProgress < 100;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>上傳新版本 (v{currentVersionNumber + 1})</DialogTitle>
              <DialogDescription>
                上傳新版本將會進入審核流程。
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>版本備註 (選填)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="說明此版本的修改內容..."
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="videoFile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>影片檔案</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept={ACCEPTED_VIDEO_TYPES.join(',')}
                        disabled={isSubmitting}
                        onChange={(e) => field.onChange(e.target.files)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              {form.formState.errors.videoFile && (
                  <div>
                    <FormMessage>{form.formState.errors.videoFile?.message?.toString()}</FormMessage>
                  </div>
              )}

              {isSubmitting && (
                <div className="space-y-2">
                  <Label>
                    {isUploading
                      ? `上傳中... ${uploadProgress.toFixed(0)}%`
                      : uploadProgress === 100
                      ? '上傳完成，處理中...'
                      : '準備上傳...'}
                  </Label>
                  <Progress value={uploadProgress} />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isUploading ? '上傳中' : '處理中'}
                  </>
                ) : (
                  '提交'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
