'use client';
import { useState } from 'react';
import { Wand2, Check, Edit, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { suggestAnnotationsWithAI, type SuggestAnnotationsWithAIOutput } from '@/ai/flows/suggest-annotations-with-ai';
import { Video, Version } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';

interface AiSuggestionSectionProps {
  video: Video;
  selectedVersion: Version;
  onSuggestionClick: (timecode: number) => void;
  onAddComment: (commentText: string, timecode: number) => void;
  onEditSuggestion: (commentText: string) => void;
}

type Suggestion = SuggestAnnotationsWithAIOutput['suggestions'][0] & { id: number };

export default function AiSuggestionSection({ video, selectedVersion, onSuggestionClick, onAddComment, onEditSuggestion }: AiSuggestionSectionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const { toast } = useToast();

  const handleGetSuggestions = async () => {
    if (!selectedVersion.videoUrl) {
      toast({
        variant: 'destructive',
        title: '缺少影片資料',
        description: '無法取得 AI 建議。',
      });
      return;
    }

    setIsLoading(true);
    setSuggestions(null);
    try {
      // The flow is updated to handle URLs directly.
      const result = await suggestAnnotationsWithAI({ videoUrl: selectedVersion.videoUrl });
      setSuggestions(result.suggestions.map((s, i) => ({...s, id: i})));
    } catch (error) {
      console.error('AI suggestion error:', error);
      toast({
        variant: 'destructive',
        title: 'AI 建議失敗',
        description: '無法與 AI 模型連線，請稍後再試。',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const parseTimecode = (time: string) => {
    const parts = time.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  }

  const handleAccept = (suggestion: Suggestion) => {
    onAddComment(suggestion.content, parseTimecode(suggestion.timecode));
    setSuggestions(current => current?.filter(s => s.id !== suggestion.id) || null);
    toast({
        title: '已接受建議',
        description: 'AI 建議已新增至評論列表。'
    })
  };

  const handleEdit = (suggestion: Suggestion) => {
    onEditSuggestion(suggestion.content);
    setSuggestions(current => current?.filter(s => s.id !== suggestion.id) || null);
  };
  
  const handleReject = (suggestionId: number) => {
    setSuggestions(current => current?.filter(s => s.id !== suggestionId) || null);
  };


  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle className="text-base">AI 註解建議</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleGetSuggestions} disabled={isLoading} className="w-full">
          <Wand2 className="mr-2 h-4 w-4" />
          {isLoading ? '分析中...' : '取得 AI 建議'}
        </Button>
        <div className="space-y-3">
          {isLoading && (
            <>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </>
          )}
          {suggestions && suggestions.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">AI 未找到可建議的註解。</p>
          )}
          {suggestions && suggestions.map((suggestion) => (
            <div key={suggestion.id} className="rounded-lg border bg-card p-3 space-y-2 text-sm">
              <button 
                onClick={() => onSuggestionClick(parseTimecode(suggestion.timecode))}
                className="font-mono text-primary hover:underline cursor-pointer"
              >
                {suggestion.timecode}
              </button>
              <p className="text-foreground">{suggestion.content}</p>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleReject(suggestion.id)}>
                  <X className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => handleEdit(suggestion)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-accent-foreground" onClick={() => handleAccept(suggestion)}>
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
