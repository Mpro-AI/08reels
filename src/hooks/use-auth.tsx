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
  signInWithRedirect,
  getRedirectResult,
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

    getRedirectResult(firebaseAuth)
      .then((result) => {
        if (result) {
          toast({
            title: `歡迎回來, ${result.user.displayName}`,
            description: `您已使用 Google 帳號成功登入。`,
          });
        }
      })
      .catch((error) => {
        console.error("Google redirect result error", error);
        toast({
          variant: 'destructive',
          title: '登入失敗',
          description: '處理您的登入資訊時發生錯誤。',
        });
      });


    return () => unsubscribe();
  }, [firebaseAuth, handleUser, toast]);
  
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
      await signInWithRedirect(firebaseAuth, provider);
      // The redirect will cause the page to unload, so we don't need to do anything here.
      // The result will be handled by getRedirectResult in the useEffect hook.
      return true;
    } catch (error: any) {
       console.error("Google sign-in redirect failed", error);
       toast({
        variant: 'destructive',
        title: '登入失敗',
        description: '無法啟動 Google 登入流程，請稍後再試。',
      });
      setLoading(false);
      return false;
    }
  }, [firebaseAuth, toast]);

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
