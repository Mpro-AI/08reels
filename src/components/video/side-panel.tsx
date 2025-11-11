'use client';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, GitBranch, Wand2 } from 'lucide-react';
import CommentSection from './comment-section';
import VersionSection from './version-section';
import AiSuggestionSection from './ai-suggestion-section';
import { Video, Version } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';

interface SidePanelProps {
  video: Video;
  selectedVersion: Version;
  onVersionChange: (versionId: string) => void;
  onTimecodeClick: (timecode: number) => void;
  currentTimeFormatted: string;
  onAddComment: (commentText: string, timecode?: number) => void;
}

export default function SidePanel({ video, selectedVersion, onVersionChange, onTimecodeClick, currentTimeFormatted, onAddComment }: SidePanelProps) {
  const { user } = useAuth();
  const [commentInput, setCommentInput] = useState('');

  const handleSuggestionToComment = (content: string) => {
    setCommentInput(content);
  };

  return (
    <div className="h-full bg-card border-l flex flex-col">
      <Tabs defaultValue="comments" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 m-2">
          <TabsTrigger value="comments">
            <MessageSquare className="mr-1.5 h-4 w-4" />
            評論
          </TabsTrigger>
          <TabsTrigger value="versions">
            <GitBranch className="mr-1.5 h-4 w-4" />
            版本
          </TabsTrigger>
          <TabsTrigger value="ai" disabled={user?.role !== 'admin'}>
            <Wand2 className="mr-1.5 h-4 w-4" />
            AI 建議
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
                />
            </TabsContent>
            <TabsContent value="versions" className="m-0">
                <VersionSection 
                  versions={video.versions} 
                  selectedVersionId={selectedVersion.id}
                  onVersionChange={onVersionChange}
                />
            </TabsContent>
            <TabsContent value="ai" className="m-0">
                {user?.role === 'admin' && (
                  <AiSuggestionSection 
                    video={video} 
                    onSuggestionClick={onTimecodeClick}
                    onAddComment={onAddComment}
                    onEditComment={handleSuggestionToComment}
                  />
                )}
            </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
