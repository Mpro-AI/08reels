'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { UploadVideoDialog } from '@/components/video/upload-video-dialog';
import { useAuth } from '@/hooks/use-auth';

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const { user } = useAuth();

  return (
    <header className="flex h-16 items-center border-b bg-card px-4 md:px-6 shrink-0">
      <h1 className="text-xl font-semibold font-headline">{title}</h1>
      {user && (
        <div className="ml-auto">
          <Button onClick={() => setIsUploadOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            上傳影片
          </Button>
          <UploadVideoDialog 
            isOpen={isUploadOpen} 
            onOpenChange={setIsUploadOpen}
          />
        </div>
      )}
    </header>
  );
}
