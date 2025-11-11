'use client';
import { usePathname } from 'next/navigation';
import AppLayout from '@/components/app-layout';

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // 登入頁不需要 AppLayout
  if (pathname === '/login') {
    return (
      <div className="animate-fade-in w-full h-full">
        {children}
      </div>
    );
  }
  
  // 其他頁面使用 AppLayout
  return (
    <div className="animate-fade-in w-full h-full">
      <AppLayout>
        {children}
      </AppLayout>
    </div>
  );
}
