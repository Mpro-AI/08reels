'use client';
import { useState, ReactNode, useEffect } from 'react';
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
import { addVideo } from '@/firebase/firestore/videos';
import { useFirestore } from '@/firebase';
import { Loader2, Image as ImageIcon, Users } from 'lucide-react';
import { uploadVideoAndGetUrl } from '@/firebase/storage';
import { useStorage } from '@/firebase';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '../ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import Image from 'next/image';
import { Skeleton } from '../ui/skeleton';
import { getAllEmployees } from '@/firebase/firestore/users';
import { User } from '@/lib/types';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';

const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB
const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/avi", "video/webm"];

const formSchema = z.object({
  title: z.string().min(1, '標題為必填欄位'),
  notes: z.string().optional(),
  videoFile: z.instanceof(FileList)
    .refine(files => files?.length > 0, '請選擇一個影片檔案')
    .refine(files => files?.[0]?.size <= MAX_FILE_SIZE, `檔案大小不能超過 1GB。`)
    .refine(
      files => ACCEPTED_VIDEO_TYPES.includes(files?.[0]?.type),
      "不支援的檔案格式，僅支援 MP4, MOV, AVI, WEBM。"
    ),
  assignedUserIds: z.array(z.string()).optional(),
});

type UploadVideoForm = z.infer<typeof formSchema>;

interface UploadVideoDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function UploadVideoDialog({ isOpen, onOpenChange }: UploadVideoDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  const [employees, setEmployees] = useState<User[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const firestore = useFirestore();
  const storage = useStorage();

  const form = useForm<UploadVideoForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      notes: '',
      videoFile: undefined,
      assignedUserIds: [],
    }
  });

  useEffect(() => {
    const fetchEmployees = async () => {
      if (isOpen && firestore) {
        setIsLoadingEmployees(true);
        try {
          const employeeList = await getAllEmployees(firestore);
          // Exclude current user from the list if they are an employee
          setEmployees(employeeList.filter(e => e.id !== user?.id));
        } catch (error) {
          console.error("Failed to fetch employees:", error);
          toast({ variant: 'destructive', title: '無法載入員工列表' });
        } finally {
          setIsLoadingEmployees(false);
        }
      }
    };
    fetchEmployees();
  }, [isOpen, firestore, toast, user]);

  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      form.setValue('videoFile', files, { shouldValidate: true });

      setThumbnailPreview(null);
      setIsGeneratingThumbnail(true);
      try {
        const thumbnailBlob = await uploadVideoAndGetUrl(storage, file, () => {}, undefined, undefined, true);
        setThumbnailPreview(URL.createObjectURL(thumbnailBlob as unknown as Blob));
      } catch (error) {
        console.error("Thumbnail generation failed:", error);
        toast({
          variant: 'destructive',
          title: '縮圖預覽生成失敗',
          description: '無法從此影片生成預覽，但仍可繼續上傳。',
        });
      } finally {
        setIsGeneratingThumbnail(false);
      }
    } else {
      form.resetField('videoFile');
      setThumbnailPreview(null);
    }
  };
  
  useEffect(() => {
    if(isOpen) {
      form.reset();
      setIsSubmitting(false);
      setUploadProgress(0);
      setThumbnailPreview(null);
      setIsGeneratingThumbnail(false);
      setSelectedUserIds([]);
    }
  }, [isOpen, form]);

  const handleClose = () => {
    if (isSubmitting) return;
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

        const { videoUrl, videoId, thumbnailUrl } = await uploadVideoAndGetUrl(
          storage, 
          videoFile, 
          setUploadProgress
        );

        const newVideoData = {
            title: data.title,
            videoUrl: videoUrl,
            thumbnailUrl: thumbnailUrl,
            notes: data.notes,
            assignedUserIds: selectedUserIds,
        };
        await addVideo(firestore, videoId, newVideoData, { id: user.id, name: user.name });
        toast({ title: '成功', description: '新影片專案已成功建立。' });
        
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>上傳新專案影片</DialogTitle>
              <DialogDescription>
                請提供影片標題、選擇檔案，並可選擇性地指派給特定員工。
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(80vh-10rem)] pr-6">
              <div className="grid gap-4 py-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>標題</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isSubmitting} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>備註 (選填)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="影片內容、目標客群等..." {...field} disabled={isSubmitting}/>
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
                            onChange={handleVideoFileChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {thumbnailPreview || isGeneratingThumbnail ? (
                  <div className="space-y-2">
                      <Label>縮圖預覽</Label>
                      <div className="aspect-video w-full rounded-md overflow-hidden relative bg-muted flex items-center justify-center">
                        {isGeneratingThumbnail && <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />}
                        {thumbnailPreview && !isGeneratingThumbnail && (
                          <Image src={thumbnailPreview} alt="Video thumbnail preview" fill className="object-contain" />
                        )}
                      </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label>指派給用戶 (選填)</Label>
                  <p className="text-sm text-muted-foreground">選擇可以查看此影片的員工。若不選擇，則所有員工皆可查看。</p>
                  {isLoadingEmployees ? (
                    <Skeleton className="h-24 w-full" />
                  ) : (
                    <div className='rounded-md border'>
                      <div className='flex items-center justify-between p-2 border-b'>
                        <Label className='flex items-center gap-2 font-normal text-sm'>
                            <Checkbox
                                checked={employees.length > 0 && selectedUserIds.length === employees.length}
                                onCheckedChange={handleSelectAll}
                                id="select-all-users"
                              />
                              全選
                        </Label>
                        <span className="text-sm text-muted-foreground">{selectedUserIds.length} / {employees.length} 已選擇</span>
                      </div>
                      <ScrollArea className="h-32">
                        <div className="p-2 space-y-2">
                          {employees.map(employee => (
                            <div key={employee.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`user-${employee.id}`}
                                checked={selectedUserIds.includes(employee.id)}
                                onCheckedChange={(checked) => {
                                  setSelectedUserIds(prev => 
                                    checked ? [...prev, employee.id] : prev.filter(id => id !== employee.id)
                                  )
                                }}
                              />
                              <Label htmlFor={`user-${employee.id}`} className="font-normal w-full">
                                {employee.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>

                {(form.formState.errors.title || form.formState.errors.videoFile) && (
                    <div>
                      <FormMessage>{form.formState.errors.title?.message || form.formState.errors.videoFile?.message?.toString()}</FormMessage>
                    </div>
                )}
                {isSubmitting && (
                    <div className="space-y-2">
                        <Label>{isUploading ? `上傳中... ${uploadProgress.toFixed(0)}%` : (uploadProgress === 100 ? '上傳完成，處理中...' : '準備上傳...')}</Label>
                        <Progress value={uploadProgress} />
                    </div>
                )}
              </div>
            </ScrollArea>
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>取消</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {isUploading ? '上傳中' : '處理中'}</> : '提交'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
