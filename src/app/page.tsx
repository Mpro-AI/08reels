'use client';
import { useContext } from 'react';
import AppLayout, { AppLayoutContext } from '@/components/app-layout';
import Header from '@/components/header';
import VideoGrid from '@/components/dashboard/video-grid';
import { Skeleton } from '@/components/ui/skeleton';
import { useStorage } from '@/firebase';
import { uploadVideoAndGetUrl } from '@/firebase/storage';
import { Button } from '@/components/ui/button';

function StorageUploadTest() {
  const storage = useStorage();

  const handleTestUpload = async () => {
    if (!storage) {
      console.error("Storage not initialized");
      return;
    }

    console.log("Starting upload test...");

    try {
      // 1. Create a dummy file in memory
      const content = "hello world from test upload";
      const blob = new Blob([content], { type: 'text/plain' });
      const file = new File([blob], "test.txt", { type: 'text/plain' });

      console.log("Dummy file created:", file);

      // 2. Define a progress callback
      const onProgress = (progress: number) => {
        console.log(`Upload Progress: ${progress.toFixed(2)}%`);
      };

      // 3. Call the upload function
      const { downloadURL, videoId } = await uploadVideoAndGetUrl(
        storage,
        file,
        onProgress
      );

      // 4. Log success
      console.log("✅ Upload Successful!");
      console.log("Video ID:", videoId);
      console.log("Download URL:", downloadURL);
      alert(`測試成功！檔案已上傳至 Storage。\nVideo ID: ${videoId}\n請在開發者控制台查看詳細資訊。`);

    } catch (error) {
      // 5. Log failure
      console.error("❌ Upload Test Failed:", error);
      alert(`測試失敗！無法上傳檔案至 Storage。\n請在開發者控制台查看詳細錯誤訊息。`);
    }
  };

  return (
    <div className="p-4 m-4 border rounded-lg bg-card">
      <h2 className="text-lg font-semibold mb-2">Storage 上傳功能測試</h2>
      <p className="text-sm text-muted-foreground mb-4">點擊按鈕來上傳一個測試文字檔 (`test.txt`) 到 Firebase Storage，並在開發者控制台中查看結果。</p>
      <Button onClick={handleTestUpload}>執行上傳測試</Button>
    </div>
  );
}


export default function DashboardPage() {
  const { videos, loading } = useContext(AppLayoutContext);

  return (
    <AppLayout>
      <div className="flex flex-1 flex-col">
        <Header title="專案影片" />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <StorageUploadTest />
          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-full" />
              ))}
            </div>
          ) : (
            <VideoGrid videos={videos || []} />
          )}
        </main>
      </div>
    </AppLayout>
  );
}
