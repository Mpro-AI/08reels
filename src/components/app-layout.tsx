'use client';
import React, { useEffect, useMemo, createContext } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from '@/components/ui/sidebar';
import Link from 'next/link';
import { Film, LogOut, Home } from 'lucide-react';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Video, User } from '@/lib/types';

interface AppLayoutContextType {
  videos: Video[] | null;
  loading: boolean;
  allUsers: User[] | null;
}

export const AppLayoutContext = createContext<AppLayoutContextType>({
  videos: null,
  loading: true,
  allUsers: null,
});

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const firestore = useFirestore();

  const videosQuery = useMemo(() => {
    if (!firestore || !isAuthenticated) return null;
    return query(
      collection(firestore, 'videos'),
      orderBy('uploadedAt', 'desc')
    );
  }, [firestore, isAuthenticated]);

  const { data: videos, loading: videosLoading, error } = useCollection<Video>(videosQuery);
  
  const usersQuery = useMemo(() => {
    if (!firestore || !isAuthenticated) return null;
    return collection(firestore, 'users');
  }, [firestore, isAuthenticated]);
  const { data: allUsers } = useCollection<User>(usersQuery);

  const filteredVideos = useMemo(() => {
    if (!videos || !user) return [];
    if (user.role === 'admin') {
      return videos.filter(v => !v.isDeleted);
    }
    return videos.filter(v => {
      if (v.isDeleted) return false;
      const isAuthor = v.author.id === user.id;
      const isAssigned = v.assignedUserIds?.includes(user.id);
      const isPublic = !v.assignedUserIds || v.assignedUserIds.length === 0;
      return isAuthor || isAssigned || isPublic;
    });
  }, [videos, user]);
  

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎬 Videos loading:', videosLoading);
      console.log('🎬 Videos data:', videos);
      console.log('🎬 Filtered videos data:', filteredVideos);
      console.log('🎬 Videos error:', error);
      console.log('🎬 Firestore:', firestore ? 'Connected' : 'Not connected');
      console.log('🎬 Authenticated:', isAuthenticated);
      console.log('👤 Current user:', user);
    }
  }, [videos, filteredVideos, videosLoading, error, firestore, isAuthenticated, user]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=${pathname}`);
    }
  }, [authLoading, isAuthenticated, router, pathname]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Icons.logo className="h-12 w-12 animate-pulse text-primary" />
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }
  
  return (
    <AppLayoutContext.Provider value={{ videos: filteredVideos, loading: videosLoading, allUsers }}>
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
                  <p className="px-4 py-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                    專案列表 {filteredVideos && filteredVideos.length > 0 && `(${filteredVideos.length})`}
                  </p>
                  
                  {videosLoading && !videos && Array.from({ length: 3 }).map((_, i) => (
                    <SidebarMenuItem key={i}>
                      <div className="flex items-center gap-2 p-2">
                        <Skeleton className="size-4" />
                        <Skeleton className="h-4 w-24 group-data-[collapsible=icon]:hidden" />
                      </div>
                    </SidebarMenuItem>
                  ))}
                  
                  {error && (
                    <SidebarMenuItem>
                      <div className="px-4 py-2 text-xs text-destructive">
                        載入失敗: {error.message}
                      </div>
                    </SidebarMenuItem>
                  )}
                  
                  {!videosLoading && filteredVideos?.length === 0 && (
                    <SidebarMenuItem>
                      <div className="px-4 py-2 text-xs text-muted-foreground">
                        尚無影片專案
                      </div>
                    </SidebarMenuItem>
                  )}
                  
                  {filteredVideos?.map(video => (
                      <SidebarMenuItem key={video.id}>
                          <SidebarMenuButton asChild tooltip={video.title} isActive={pathname.startsWith(`/videos/${video.id}`)}>
                              <Link href={`/videos/${video.id}`}>
                                  <Film />
                                  <span>{video.title}</span>
                              </Link>
                          </SidebarMenuButton>
                      </SidebarMenuItem>
                  ))}
              </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
               <Button variant="ghost" className="w-full justify-start gap-2 p-2 group-data-[collapsible=icon]:justify-center" onClick={() => logout()}>
                  <LogOut className="size-4 shrink-0" />
                  <span className="group-data-[collapsible=icon]:hidden">登出</span>
               </Button>
          </SidebarFooter>
        </Sidebar>
        <div className="flex-1 flex flex-col ml-[3rem] group-data-[state=expanded]/sidebar-wrapper:ml-[16rem] transition-[margin-left] duration-200">
          {children}
        </div>
      </SidebarProvider>
    </AppLayoutContext.Provider>
  );
}
