'use client';
import { MessageSquare, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Comment } from '@/lib/types';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';

interface CommentSectionProps {
  comments: Comment[];
  onCommentClick: (timecode: number) => void;
  currentTimeFormatted: string;
  onAddComment: (commentText: string) => void;
  inputValue: string;
  onInputValueChange: (value: string) => void;
}

export default function CommentSection({ comments, onCommentClick, currentTimeFormatted, onAddComment, inputValue, onInputValueChange }: CommentSectionProps) {
  const { user } = useAuth();

  const handleAddComment = () => {
    if (inputValue.trim() && user) {
      onAddComment(inputValue);
      onInputValueChange('');
    }
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>時間軸評論</span>
          <span className="text-sm font-mono text-muted-foreground">{currentTimeFormatted}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Textarea 
            placeholder="在目前時間點新增評論..." 
            className="mb-2" 
            value={inputValue}
            onChange={(e) => onInputValueChange(e.target.value)}
          />
          <Button className="w-full" onClick={handleAddComment} disabled={!inputValue.trim()}>
            <Plus className="mr-2 h-4 w-4" />
            新增評論
          </Button>
        </div>
        <div className="space-y-4 max-h-[calc(100vh-25rem)] overflow-y-auto pr-2">
          {comments.length > 0 ? (
            comments
              .sort((a,b) => a.timecode - b.timecode)
              .map(comment => (
              <div key={comment.id} className="text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">{comment.author.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(comment.createdAt), 'yyyy-MM-dd HH:mm')}
                  </span>
                </div>
                <div 
                  className="p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted"
                  onClick={() => onCommentClick(comment.timecode)}
                >
                  <p className="text-primary font-mono text-xs mb-1">{comment.timecodeFormatted}</p>
                  <p className="text-foreground">{comment.text}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="mx-auto h-12 w-12" />
              <p className="mt-2 text-sm">尚未有任何評論</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
