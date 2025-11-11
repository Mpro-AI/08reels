'use client';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, GitBranch } from 'lucide-react';
import CommentSection from './comment-section';
import VersionSection from './version-section';
import { Video, Version, VersionStatus, Comment } from '@/lib/types';
import type { AnnotationMode } from '@/app/videos/[id]/page';
import { useFirestore } from '@/firebase';
import { addCommentToVersion, deleteCommentFromVersion } from '@/firebase/firestore/videos';
import { useAuth } from '@/hooks/use-auth';

interface SidePanelProps {
  video: Video;
  selectedVersion: Version;
  onVersionChange: (versionId: string) => void;
  onTimecodeClick: (timecode: number) => void;
  currentTimeFormatted: string;
  onAnnotationClick: (timecode: number, mode: AnnotationMode) => void;
}

export default function SidePanel({ 
    video, 
    selectedVersion, 
    onVersionChange, 
    onTimecodeClick, 
    currentTimeFormatted,
    onAnnotationClick,
}: SidePanelProps) {
  const [commentInput, setCommentInput] = useState('');
  const firestore = useFirestore();
  const { user } = useAuth();

  const handleAddComment = (commentText: string) => {
    if (!firestore || !user) return;
    const player = document.querySelector('video');
    const currentTime = player ? player.currentTime : 0;
    
    addCommentToVersion(
      firestore,
      video.id,
      selectedVersion.id,
      {
        text: commentText,
        timecode: Math.floor(currentTime),
        timecodeFormatted: formatTime(currentTime),
      },
      { id: user.id, name: user.name },
    );
  };
  
  const handleDeleteComment = (commentId: string) => {
    if (!firestore) return;
    deleteCommentFromVersion(firestore, video.id, selectedVersion.id, commentId);
  };

  const handleStatusChange = (versionId: string, status: VersionStatus) => {
     if (!firestore) return;
     // This logic is now handled in the parent component via props, 
     // but if it were here, it would look like this:
     // setVersionStatus(firestore, video.id, versionId, status);
     console.log("Status change requested in side panel, but handled by parent:", {versionId, status});
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
  }

  return (
    <div className="h-full bg-card border-l flex flex-col">
      <Tabs defaultValue="comments" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 m-2">
          <TabsTrigger value="comments">
            <MessageSquare className="mr-1.5 h-4 w-4" />
            評論
          </TabsTrigger>
          <TabsTrigger value="versions">
            <GitBranch className="mr-1.5 h-4 w-4" />
            版本
          </TabsTrigger>
        </TabsList>
        <div className="flex-1 overflow-y-auto">
            <TabsContent value="comments" className="m-0">
                <CommentSection 
                    comments={selectedVersion.comments} 
                    onCommentClick={onTimecodeClick} 
                    currentTimeFormatted={currentTimeFormatted}
                    onAddComment={handleAddComment}
                    inputValue={commentInput}
                    onInputValueChange={setCommentInput}
                    onDeleteComment={handleDeleteComment}
                    onAnnotationClick={onAnnotationClick}
                />
            </TabsContent>
            <TabsContent value="versions" className="m-0">
                <VersionSection 
                  video={video}
                  versions={video.versions} 
                  selectedVersionId={selectedVersion.id}
                  onVersionChange={onVersionChange}
                  onStatusChange={handleStatusChange}
                />
            </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}