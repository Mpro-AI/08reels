'use client';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, GitBranch } from 'lucide-react';
import CommentSection from './comment-section';
import VersionSection from './version-section';
import { Video, Version, VersionStatus } from '@/lib/types';
import type { AnnotationMode } from '@/app/videos/[id]/page';

interface SidePanelProps {
  video: Video;
  selectedVersion: Version;
  onVersionChange: (versionId: string) => void;
  onTimecodeClick: (timecode: number) => void;
  currentTimeFormatted: string;
  onAddComment: (commentText: string, timecode?: number) => void;
  onVersionStatusChange: (versionId: string, status: VersionStatus) => void;
  onDeleteComment: (commentId: string) => void;
  onAnnotationClick: (timecode: number, mode: AnnotationMode) => void;
}

export default function SidePanel({ 
    video, 
    selectedVersion, 
    onVersionChange, 
    onTimecodeClick, 
    currentTimeFormatted, 
    onAddComment, 
    onVersionStatusChange,
    onDeleteComment,
    onAnnotationClick,
}: SidePanelProps) {
  const [commentInput, setCommentInput] = useState('');

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
                    onAddComment={onAddComment}
                    inputValue={commentInput}
                    onInputValueChange={setCommentInput}
                    onDeleteComment={onDeleteComment}
                    onAnnotationClick={onAnnotationClick}
                />
            </TabsContent>
            <TabsContent value="versions" className="m-0">
                <VersionSection 
                  video={video}
                  versions={video.versions} 
                  selectedVersionId={selectedVersion.id}
                  onVersionChange={onVersionChange}
                  onStatusChange={onVersionStatusChange}
                />
            </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
