
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import { useAuth } from '@/hooks/use-auth';
import { UserManagementTable } from '@/components/admin/user-management-table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="flex flex-1 flex-col">
        <Header title="後台管理" />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
        <div className="flex flex-1 flex-col">
          <Header title="權限不足" />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <Alert variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertTitle>存取被拒</AlertTitle>
              <AlertDescription>
                您沒有權限存取此頁面。此頁面僅供管理員使用。
              </AlertDescription>
            </Alert>
          </main>
        </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <Header title="後台管理" />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <UserManagementTable />
      </main>
    </div>
  );
}
