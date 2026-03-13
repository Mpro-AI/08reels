'use client';
import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy as fbOrderBy } from 'firebase/firestore';
import { db } from '../client';
import type { Video, User } from '@/lib/types';

interface UseCollectionOptions {
  table: string;
  orderBy?: { column: string; ascending?: boolean };
  enabled?: boolean;
}

export function useCollection<T>(
  options: UseCollectionOptions | null,
): { data: T[] | null; loading: boolean; error: Error | null } {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!options || options.enabled === false) {
      setData(null);
      setLoading(false);
      return;
    }

    const collRef = collection(db, options.table);
    const q = options.orderBy
      ? query(collRef, fbOrderBy(options.orderBy.column, options.orderBy.ascending === false ? 'desc' : 'asc'))
      : collRef;

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => {
          const raw = doc.data();
          if (options.table === 'videos') {
            return { ...raw, id: doc.id } as unknown as T;
          }
          if (options.table === 'users') {
            return {
              id: doc.id,
              name: raw.name,
              email: raw.email,
              photoURL: raw.photoURL,
              role: raw.role,
            } as unknown as T;
          }
          return { ...raw, id: doc.id } as unknown as T;
        });
        setData(items);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [options?.table, options?.orderBy?.column, options?.orderBy?.ascending, options?.enabled]);

  return { data, loading, error };
}
