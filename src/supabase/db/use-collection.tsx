'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSupabase } from '@/supabase';
import type { Video, Version, Comment, Annotation } from '@/lib/types';

// Map a raw DB video row + its versions/comments/annotations into our Video type
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

interface UseCollectionOptions {
  table: string;
  orderBy?: { column: string; ascending?: boolean };
  enabled?: boolean;
}

export function useCollection<T>(
  options: UseCollectionOptions | null
): { data: T[] | null; loading: boolean; error: Error | null } {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = useSupabase();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const fetchData = useCallback(async () => {
    if (!options || options.enabled === false) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      if (options.table === 'videos') {
        // Fetch videos with nested versions, comments, and annotations
        let query = supabase
          .from('videos')
          .select(`
            *,
            versions (
              *,
              comments (*),
              annotations (*)
            )
          `);

        if (options.orderBy) {
          query = query.order(options.orderBy.column, {
            ascending: options.orderBy.ascending ?? true,
          });
        }

        const { data: rows, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        const mapped = (rows || []).map(mapVideoRow);
        setData(mapped as T[]);
      } else if (options.table === 'users') {
        const { data: rows, error: fetchError } = await supabase
          .from('users')
          .select('*');

        if (fetchError) throw fetchError;

        const mapped = (rows || []).map((row: any) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          photoURL: row.photo_url,
          role: row.role,
        }));
        setData(mapped as T[]);
      } else {
        const { data: rows, error: fetchError } = await supabase
          .from(options.table)
          .select('*');

        if (fetchError) throw fetchError;
        setData((rows || []) as T[]);
      }

      setError(null);
    } catch (err: any) {
      console.error('useCollection error:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [supabase, options?.table, options?.orderBy?.column, options?.orderBy?.ascending, options?.enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set up Supabase realtime subscription
  useEffect(() => {
    if (!options || options.enabled === false) return;

    const tablesToWatch = options.table === 'videos'
      ? ['videos', 'versions', 'comments', 'annotations']
      : [options.table];

    const channel = supabase
      .channel(`collection-${options.table}-${Date.now()}`)

    for (const table of tablesToWatch) {
      channel.on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table },
        () => {
          // Refetch on any change
          fetchData();
        }
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, options?.table, options?.enabled, fetchData]);

  return { data, loading, error };
}
