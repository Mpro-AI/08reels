'use client';
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { useSupabase } from '@/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<boolean>;
  signupWithEmail: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const supabase = useSupabase();

  const upsertUserProfile = useCallback(async (supabaseUser: SupabaseUser): Promise<User | null> => {
    if (!supabaseUser) return null;

    try {
      const { data: existingUser, error: selectError } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        console.error('[upsertUserProfile] select error:', selectError);
      }

      if (existingUser) {
        return {
          id: existingUser.id,
          name: existingUser.name || supabaseUser.email?.split('@')[0] || 'Anonymous',
          email: existingUser.email || supabaseUser.email,
          photoURL: existingUser.photo_url,
          role: existingUser.role === 'admin' ? 'admin' : 'employee',
        };
      } else {
        const appUser: User = {
          id: supabaseUser.id,
          name: supabaseUser.email?.split('@')[0] || 'Anonymous',
          email: supabaseUser.email,
          photoURL: null,
          role: 'employee',
        };

        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: supabaseUser.id,
            name: appUser.name,
            email: appUser.email,
            photo_url: appUser.photoURL,
            role: appUser.role,
          });

        if (insertError) {
          console.error('[upsertUserProfile] insert error:', insertError);
        }

        return appUser;
      }
    } catch (err) {
      console.error('[upsertUserProfile] unexpected error:', err);
      // Fallback: return minimal user from auth data so app still works
      return {
        id: supabaseUser.id,
        name: supabaseUser.email?.split('@')[0] || 'Anonymous',
        email: supabaseUser.email,
        photoURL: null,
        role: 'employee',
      };
    }
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    // Safety net: if auth hasn't resolved after 8s, force loading off
    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn('[auth] 8s timeout — forcing loading off');
        setLoading(false);
      }
    }, 8000);

    // IMPORTANT: Do NOT call getSession() here — it competes with
    // signInWithPassword() for the Supabase auth lock and causes login to hang.
    // onAuthStateChange fires INITIAL_SESSION on mount, which handles the
    // refresh case (reads cached session from localStorage).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        try {
          if (session?.user) {
            const appUser = await upsertUserProfile(session.user);
            if (mounted) setUser(appUser);
          } else {
            if (mounted) setUser(null);
          }
        } catch (err) {
          console.error('[onAuthStateChange] error:', err);
          if (mounted) setUser(null);
        } finally {
          // ALWAYS clear loading — no matter what happens above
          if (mounted) {
            setLoading(false);
            clearTimeout(timeout);
          }
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [supabase, upsertUserProfile]);

  const isAuthenticated = !!user;

  const loginWithEmail = useCallback(async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast({ title: '登入成功' });
      return true;
    } catch (error: any) {
      console.error("Email sign-in failed", error);
      let description = '發生未知錯誤，請稍後再試。';
      if (error.message?.includes('Invalid login credentials')) {
        description = '電子郵件或密碼不正確。';
      }
      toast({ variant: 'destructive', title: '登入失敗', description });
      setLoading(false);
      return false;
    }
  }, [supabase, toast]);

  const signupWithEmail = useCallback(async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      toast({ title: '註冊成功', description: '歡迎加入！您現在可以登入。' });
      return true;
    } catch (error: any) {
      console.error("Email sign-up failed", error);
      let description = '發生未知錯誤，請稍後再試。';
      if (error.message?.includes('already registered')) {
        description = '這個電子郵件地址已經被註冊了。';
      } else if (error.message?.includes('Password should be')) {
        description = '密碼強度不足，請使用更長的密碼。';
      } else if (error.message?.includes('valid email')) {
        description = '請輸入有效的電子郵件地址。';
      }
      toast({ variant: 'destructive', title: '註冊失敗', description });
      setLoading(false);
      return false;
    }
  }, [supabase, toast]);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      toast({ title: '已登出', description: '您已成功登出。' });
    } catch (error) {
      console.error("Sign out failed", error);
      toast({ variant: 'destructive', title: '登出失敗', description: '登出時發生錯誤。' });
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loading, loginWithEmail, signupWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
