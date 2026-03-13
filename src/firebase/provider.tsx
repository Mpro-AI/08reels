'use client';
import { ReactNode } from 'react';
// Firebase is initialized as a side effect when client.ts is imported.
// This provider exists purely for API compatibility with the old SupabaseProvider.
import './client';

export function FirebaseProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
