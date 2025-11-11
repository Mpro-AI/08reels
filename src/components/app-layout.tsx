'use client';
import React, { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import Link from 'next/link';
import { Film, LogOut, Home } from 'lucide-react';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Video } from '@/lib/types';


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const firestore = useFirestore();
  const videosQuery = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'videos');
  }, [firestore]);

  const { data: videos, loading } = useCollection<Video>(videosQuery);


  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=${pathname}`);
    }
  }, [isAuthenticated, router, pathname]);

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="space-y-4 p-8">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }
  
  return (
    <SidebarProvider>
      <Sidebar side="left" collapsible="icon" className="border-r">
        <SidebarHeader className="items-center justify-center gap-2 p-4 text-primary group-data-[collapsible=icon]:justify-center">
            <Icons.logo className="size-6 shrink-0"/>
            <span className="text-lg font-bold group-data-[collapsible=icon]:hidden">Reels 08</span>
        </SidebarHeader>
        <SidebarContent>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="首頁" isActive={pathname === '/'}>
                        <Link href="/">
                            <Home />
                            <span>首頁</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
            <SidebarMenu className="mt-4">
                <p className="px-4 py-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">專案列表</p>
                {loading && Array.from({ length: 3 }).map((_, i) => (
                  <SidebarMenuItem key={i}>
                    <div className="flex items-center gap-2 p-2">
                      <Skeleton className="size-4" />
                      <Skeleton className="h-4 w-24 group-data-[collapsible=icon]:hidden" />
                    </div>
                  </SidebarMenuItem>
                ))}
                {videos?.map(video => (
                    <SidebarMenuItem key={video.id}>
                        <SidebarMenuButton asChild tooltip={video.title} isActive={pathname === `/videos/${video.id}`}>
                            <Link href={`/videos/${video.id}`}>
                                <Film />
                                <span>{video.title}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarContent>
        <div className="p-4 mt-auto">
             <Button variant="ghost" className="w-full justify-start gap-2 p-2 group-data-[collapsible=icon]:justify-center" onClick={() => logout()}>
                <LogOut className="size-4 shrink-0" />
                <span className="group-data-[collapsible=icon]:hidden">登出</span>
             </Button>
        </div>
      </Sidebar>
      <div className="flex-1 flex flex-col min-h-screen ml-[3rem] group-data-[state=expanded]/sidebar-wrapper:ml-[16rem] transition-[margin-left] duration-200">
        {children}
      </div>
    </SidebarProvider>
  );
}
