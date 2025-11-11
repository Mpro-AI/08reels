'use client';
import AppLayout from '@/components/app-layout';
import Header from '@/components/header';
import VideoGrid from '@/components/dashboard/video-grid';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useMemo } from 'react';
import type { Video } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';

export default function DashboardPage() {
  const firestore = useFirestore();
  const { isAuthenticated } = useAuth();
  
  const videosQuery = useMemo(() => {
    if (!firestore || !isAuthenticated) return null;
    return collection(firestore, 'videos');
  }, [firestore, isAuthenticated]);

  const { data: videos, loading } = useCollection<Video>(videosQuery);

  return (
    <AppLayout>
      <div className="flex flex-1 flex-col">
        <Header title="專案影片" />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
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
