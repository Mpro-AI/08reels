'use client';
import { createContext, useContext, ReactNode } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './client';

const SupabaseContext = createContext<SupabaseClient>(supabase);

export const useSupabase = () => useContext(SupabaseContext);

export function SupabaseProvider({ children }: { children: ReactNode }) {
  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  );
}
