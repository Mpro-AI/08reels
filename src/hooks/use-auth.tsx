'use client';
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { 
  useAuth as useFirebaseAuth 
} from '@/firebase';
import {
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser,
} from 'firebase/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  login: () => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const firebaseAuth = useFirebaseAuth();

  const handleUser = useCallback((firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      const appUser: User = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || 'Anonymous',
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL,
      };
      setUser(appUser);
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!firebaseAuth) {
      setLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(firebaseAuth, handleUser);

    return () => unsubscribe();
  }, [firebaseAuth, handleUser]);
  
  const isAuthenticated = !!user;

  const login = useCallback(async (): Promise<boolean> => {
    if (!firebaseAuth) {
      toast({
        variant: 'destructive',
        title: '錯誤',
        description: '認證服務尚未準備好。',
      });
      return false;
    }

    setLoading(true);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(firebaseAuth, provider);
      handleUser(result.user);
      toast({
        title: `歡迎， ${result.user.displayName}`,
        description: `您已使用 Google 帳號成功登入。`,
      });
      setLoading(false);
      return true;
    } catch (error: any) {
      console.error("Google sign-in failed", error);
      toast({
        variant: 'destructive',
        title: '登入失敗',
        description: error.code === 'auth/popup-closed-by-user' 
          ? '您已關閉登入視窗。'
          : '無法使用 Google 登入，請稍後再試。',
      });
      setLoading(false);
      return false;
    }
  }, [firebaseAuth, toast, handleUser]);

  const logout = useCallback(async () => {
    if (!firebaseAuth) return;
    setLoading(true);
    await signOut(firebaseAuth);
    setUser(null);
    toast({
      title: '已登出',
      description: '您已成功登出。',
    });
    setLoading(false);
  }, [toast, firebaseAuth]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loading, login, logout }}>
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
