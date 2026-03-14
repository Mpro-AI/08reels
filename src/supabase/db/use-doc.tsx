'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/supabase';
import type { Video, Version, Comment, Annotation } from '@/lib/types';

function mapVideoRow(row: any): Video {
  const versions: Version[] = (row.versions || []).map((v: any) => ({
    id: v.id,
    versionNumber: v.version_number,
    status: v.status,
    createdAt: v.created_at,
    uploader: { id: v.uploader_id, name: v.uploader_name },
    comments: (v.comments || []).map((c: any) => ({
      id: c.id,
      timecode: c.timecode,
      timecodeFormatted: c.timecode_formatted,
      text: c.text,
      author: { id: c.author_id, name: c.author_name },
      createdAt: c.created_at,
    })),
    annotations: (v.annotations || []).map((a: any) => ({
      id: a.id,
      type: a.type,
      data: a.data,
      author: { id: a.author_id, name: a.author_name },
      createdAt: a.created_at,
      timecode: a.timecode,
    })),
    isCurrentActive: v.is_current_active,
    videoUrl: v.video_url,
    qualities: v.qualities || [],
    notes: v.notes,
    thumbnailUrl: v.thumbnail_url,
  }));

  return {
    id: row.id,
    title: row.title,
    thumbnailUrl: row.thumbnail_url,
    thumbnailHint: row.thumbnail_hint,
    author: { id: row.author_id, name: row.author_name },
    uploadedAt: row.uploaded_at,
    versions,
    videoUrl: row.video_url,
    assignedUserIds: row.assigned_user_ids || [],
    isDeleted: row.is_deleted,
    deletedAt: row.deleted_at,
  };
}

interface UseDocOptions {
  table: string;
  id: string | null;
}

export function useDoc<T>(
  options: UseDocOptions | null
): { data: T | null; loading: boolean; error: Error | null; setData: (data: T) => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = useSupabase();

  const fetchData = useCallback(async () => {
    if (!options || !options.id) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      if (options.table === 'videos') {
        const { data: row, error: fetchError } = await supabase
          .from('videos')
          .select(`
            *,
            versions (
              *,
              comments (*),
              annotations (*)
            )
          `)
          .eq('id', options.id)
          .single();

        if (fetchError) throw fetchError;
        if (row) {
          setData(mapVideoRow(row) as T);
        } else {
          setData(null);
        }
      } else {
        const { data: row, error: fetchError } = await supabase
          .from(options.table)
          .select('*')
          .eq('id', options.id)
          .single();

        if (fetchError) throw fetchError;
        setData(row as T);
      }

      setError(null);
    } catch (err: any) {
      console.error('useDoc error:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [supabase, options?.table, options?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    if (!options || !options.id) return;

    const tablesToWatch = options.table === 'videos'
      ? ['videos', 'versions', 'comments', 'annotations']
      : [options.table];

    const channel = supabase
      .channel(`doc-${options.table}-${options.id}-${Date.now()}`);

    for (const table of tablesToWatch) {
      channel.on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table },
        () => {
          fetchData();
        }
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, options?.table, options?.id, fetchData]);

  return { data, loading, error, setData };
}
