'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { UploadVideoDialog } from '@/components/video/upload-video-dialog';
import { DialogTrigger } from '@/components/ui/dialog';

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <header className="flex h-16 items-center border-b bg-card px-4 md:px-6 shrink-0">
      <h1 className="text-xl font-semibold font-headline">{title}</h1>
      <div className="ml-auto">
        <UploadVideoDialog 
          isOpen={isUploadOpen} 
          onOpenChange={setIsUploadOpen}
        >
          <Button onClick={() => setIsUploadOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            上傳影片
          </Button>
        </UploadVideoDialog>
      </div>
    </header>
  );
}
