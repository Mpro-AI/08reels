import AppLayout from '@/components/app-layout';
import Header from '@/components/header';
import VideoGrid from '@/components/dashboard/video-grid';
import { videos } from '@/lib/mock-data';

export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="flex flex-1 flex-col">
        <Header title="專案影片" />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <VideoGrid videos={videos} />
        </main>
      </div>
    </AppLayout>
  );
}
