'use client';
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { auth, db } from '@/firebase/client';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<boolean>;
  signupWithEmail: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Build a minimal User from Firebase auth data (no DB call, never blocks). */
function userFromAuth(firebaseUser: FirebaseUser): User {
  return {
    id: firebaseUser.uid,
    name: firebaseUser.email?.split('@')[0] || 'Anonymous',
    email: firebaseUser.email ?? undefined,
    photoURL: firebaseUser.photoURL,
    role: 'employee',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Enrich user profile from Firestore (non-blocking, fire-and-forget).
  const enrichUserProfile = useCallback(async (firebaseUser: FirebaseUser) => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data();
        setUser({
          id: snap.id,
          name: data.name || firebaseUser.email?.split('@')[0] || 'Anonymous',
          email: data.email || firebaseUser.email,
          photoURL: data.photoURL ?? null,
          role: data.role === 'admin' ? 'admin' : 'employee',
        });
      } else {
        // New user — create document in Firestore
        const appUser: User = userFromAuth(firebaseUser);
        await setDoc(userRef, {
          name: appUser.name,
          email: appUser.email,
          photoURL: appUser.photoURL,
          role: appUser.role,
        });
        // User object stays as the auth-derived one (already set)
      }
    } catch (err) {
      console.error('[enrichUserProfile] unexpected error:', err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let initialResolved = false;

    // Hard safety net: force loading off after 8s no matter what
    const hardTimeout = setTimeout(() => {
      if (mounted && !initialResolved) {
        console.warn('[auth] 8s hard timeout — forcing loading off');
        initialResolved = true;
        setLoading(false);
      }
    }, 8000);

    const resolveInitial = (appUser: User | null) => {
      if (!mounted || initialResolved) return;
      initialResolved = true;
      clearTimeout(hardTimeout);
      setUser(appUser);
      setLoading(false);
    };

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!mounted) return;

      if (firebaseUser) {
        const authUser = userFromAuth(firebaseUser);
        if (!initialResolved) {
          resolveInitial(authUser);
        } else {
          setUser(prev => prev ?? authUser);
        }
        enrichUserProfile(firebaseUser);
      } else {
        if (!initialResolved) {
          resolveInitial(null);
        } else {
          setUser(null);
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(hardTimeout);
      unsubscribe();
    };
  }, [enrichUserProfile]);

  const isAuthenticated = !!user;

  const loginWithEmail = useCallback(async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const loginResult = await Promise.race([
        signInWithEmailAndPassword(auth, email, password),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('LOGIN_TIMEOUT')), 10000)
        ),
      ]);

      toast({ title: '登入成功' });
      return true;
    } catch (error: any) {
      console.error("Email sign-in failed", error);
      let description = '發生未知錯誤，請稍後再試。';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        description = '電子郵件或密碼不正確。';
      } else if (error.message?.includes('LOGIN_TIMEOUT')) {
        description = '登入超時，請重新整理頁面後再試。';
      }
      toast({ variant: 'destructive', title: '登入失敗', description });
      setLoading(false);
      return false;
    }
  }, [toast]);

  const signupWithEmail = useCallback(async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast({ title: '註冊成功', description: '歡迎加入！您現在可以登入。' });
      return true;
    } catch (error: any) {
      console.error("Email sign-up failed", error);
      let description = '發生未知錯誤，請稍後再試。';
      if (error.code === 'auth/email-already-in-use') {
        description = '這個電子郵件地址已經被註冊了。';
      } else if (error.code === 'auth/weak-password') {
        description = '密碼強度不足，請使用更長的密碼。';
      } else if (error.code === 'auth/invalid-email') {
        description = '請輸入有效的電子郵件地址。';
      }
      toast({ variant: 'destructive', title: '註冊失敗', description });
      setLoading(false);
      return false;
    }
  }, [toast]);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      toast({ title: '已登出', description: '您已成功登出。' });
    } catch (error) {
      console.error("Sign out failed", error);
      toast({ variant: 'destructive', title: '登出失敗', description: '登出時發生錯誤。' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

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
