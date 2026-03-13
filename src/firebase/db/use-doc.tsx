'use client';
import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../client';

interface UseDocOptions {
  table: string;
  id: string | null;
}

export function useDoc<T>(
  options: UseDocOptions | null,
): { data: T | null; loading: boolean; error: Error | null; setData: (data: T) => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!options || !options.id) {
      setData(null);
      setLoading(false);
      return;
    }

    const docRef = doc(db, options.table, options.id);

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setData({ ...snapshot.data(), id: snapshot.id } as unknown as T);
        } else {
          setData(null);
        }
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [options?.table, options?.id]);

  return { data, loading, error, setData };
}
