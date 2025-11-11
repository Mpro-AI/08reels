'use client';
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { useAuth as useFirebaseAuth } from '@/firebase';
// Import only types at the top level to avoid early initialization
import type { User as FirebaseUser } from 'firebase/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<boolean>;
  loginWithEmail: (email: string, password: string) => Promise<boolean>;
  signupWithEmail: (email: string, password: string) => Promise<boolean>;
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
        name: firebaseUser.displayName || firebaseUser.email || 'Anonymous',
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

    Promise.all([
        import('firebase/auth').then(m => m.onAuthStateChanged),
        import('firebase/auth').then(m => m.getRedirectResult)
    ]).then(([onAuthStateChanged, getRedirectResult]) => {
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
            if (error.code !== 'auth/api-key-not-valid') {
              toast({
                variant: 'destructive',
                title: '登入失敗',
                description: '處理您的登入資訊時發生錯誤。',
              });
            }
          });

        return () => unsubscribe();
    }).catch(error => {
        console.error("Failed to load Firebase Auth functions", error);
        setLoading(false);
    });

  }, [firebaseAuth, handleUser, toast]);
  
  const isAuthenticated = !!user;

  const loginWithGoogle = useCallback(async (): Promise<boolean> => {
    if (!firebaseAuth) {
      toast({ variant: 'destructive', title: '錯誤', description: '認證服務尚未準備好。' });
      return false;
    }
    setLoading(true);
    try {
      const { GoogleAuthProvider, signInWithRedirect } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(firebaseAuth, provider);
      return true;
    } catch (error: any) {
       console.error("Google sign-in redirect failed", error);
       toast({ variant: 'destructive', title: '登入失敗', description: '無法啟動 Google 登入流程，請稍後再試。' });
       setLoading(false);
       return false;
    }
  }, [firebaseAuth, toast]);

  const loginWithEmail = useCallback(async (email: string, password: string): Promise<boolean> => {
    if (!firebaseAuth) {
      toast({ variant: 'destructive', title: '錯誤', description: '認證服務尚未準備好。' });
      return false;
    }
    setLoading(true);
    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      toast({ title: '登入成功' });
      return true;
    } catch (error: any) {
      console.error("Email sign-in failed", error);
      let description = '發生未知錯誤，請稍後再試。';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = '電子郵件或密碼不正確。';
      }
      toast({ variant: 'destructive', title: '登入失敗', description });
      return false;
    } finally {
      setLoading(false);
    }
  }, [firebaseAuth, toast]);

  const signupWithEmail = useCallback(async (email: string, password: string): Promise<boolean> => {
    if (!firebaseAuth) {
      toast({ variant: 'destructive', title: '錯誤', description: '認證服務尚未準備好。' });
      return false;
    }
    setLoading(true);
    try {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      await createUserWithEmailAndPassword(firebaseAuth, email, password);
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
      return false;
    } finally {
      setLoading(false);
    }
  }, [firebaseAuth, toast]);

  const logout = useCallback(async () => {
    if (!firebaseAuth) return;
    setLoading(true);
    try {
        const { signOut } = await import('firebase/auth');
        await signOut(firebaseAuth);
        setUser(null);
        toast({ title: '已登出', description: '您已成功登出。' });
    } catch(error) {
        console.error("Sign out failed", error);
        toast({ variant: 'destructive', title: '登出失敗', description: '登出時發生錯誤。' });
    } finally {
        setLoading(false);
    }
  }, [toast, firebaseAuth]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loading, loginWithGoogle, loginWithEmail, signupWithEmail, logout }}>
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
