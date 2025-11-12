'use client';
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { useAuth as useFirebaseAuth, useFirestore } from '@/firebase';
// Import only types at the top level to avoid early initialization
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

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
  const firestore = useFirestore();

  const updateUserProfileInFirestore = useCallback(async (firebaseUser: FirebaseUser) => {
    if (!firestore || !firebaseUser) return null;
    const userRef = doc(firestore, 'users', firebaseUser.uid);
    
    // Check if user document already exists
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const existingData = userSnap.data() as User;
      
      let role = existingData.role;
      // Force admin role for specific user
      if (firebaseUser.uid === 'VPkSokn932hWjebe6HpAqEcUWnX2') {
        role = 'admin';
      } else {
         // If role is already admin, don't overwrite it
        role = existingData.role === 'admin' 
          ? 'admin' 
          : (await firebaseUser.getIdTokenResult()).claims.admin ? 'admin' : 'employee';
      }
      
      let finalName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || existingData.name || 'Anonymous';
      // Force update name for specific user
      if (firebaseUser.uid === 'VPkSokn932hWjebe6HpAqEcUWnX2') {
        finalName = 'Mance';
      }

      const appUser: User = {
        ...existingData,
        id: firebaseUser.uid,
        name: finalName,
        email: firebaseUser.email || existingData.email,
        photoURL: firebaseUser.photoURL || existingData.photoURL,
        role: role,
      };
      await setDoc(userRef, appUser, { merge: true });
      return appUser;
    } else {
      // New user
      const idTokenResult = await firebaseUser.getIdTokenResult();
      const isAdmin = idTokenResult.claims.admin || firebaseUser.uid === 'VPkSokn932hWjebe6HpAqEcUWnX2';

      const appUser: User = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Anonymous',
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL,
        role: isAdmin ? 'admin' : 'employee',
      };
      await setDoc(userRef, appUser, { merge: true });
      return appUser;
    }
  }, [firestore]);


  useEffect(() => {
    if (!firebaseAuth) {
      setLoading(false);
      return;
    }

    const initAuth = async () => {
        try {
            const { onAuthStateChanged } = await import('firebase/auth');

            const handleUser = async (firebaseUser: FirebaseUser | null) => {
                if (firebaseUser) {
                    const appUser = await updateUserProfileInFirestore(firebaseUser);
                    setUser(appUser);
                } else {
                    setUser(null);
                }
                setLoading(false);
            };

            const unsubscribe = onAuthStateChanged(firebaseAuth, handleUser);
    
            return unsubscribe;

        } catch (error) {
            console.error("Failed to load Firebase Auth functions", error);
            setLoading(false);
            return () => {};
        }
    };

    let unsubscribe: (() => void) | undefined;
    initAuth().then(unsub => unsubscribe = unsub);
    
    return () => {
        if (unsubscribe) {
            unsubscribe();
        }
    };
  }, [firebaseAuth, firestore, toast, updateUserProfileInFirestore]);
  
  const isAuthenticated = !!user;

  const loginWithGoogle = useCallback(async (): Promise<boolean> => {
    if (!firebaseAuth) {
      toast({ variant: 'destructive', title: '錯誤', description: '認證服務尚未準備好。' });
      return false;
    }
    setLoading(true);
    try {
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(firebaseAuth, provider);
      await updateUserProfileInFirestore(result.user);
      toast({
        title: `歡迎回來, ${result.user.displayName}`,
        description: `您已使用 Google 帳號成功登入。`,
      });
      // setLoading is handled by onAuthStateChanged
      return true;
    } catch (error: any) {
       console.error("Google sign-in popup failed", error);
       let description = '無法使用 Google 登入，請稍後再試。';
       if (error.code === 'auth/popup-closed-by-user') {
        description = '登入視窗已關閉，請重試。';
       } else if (error.code === 'auth/unauthorized-domain') {
        description = '此應用程式網域未被授權，請聯絡管理員。'
       }
       toast({ variant: 'destructive', title: '登入失敗', description });
       setLoading(false);
       return false;
    }
  }, [firebaseAuth, toast, updateUserProfileInFirestore]);

  const loginWithEmail = useCallback(async (email: string, password: string): Promise<boolean> => {
    if (!firebaseAuth) {
      toast({ variant: 'destructive', title: '錯誤', description: '認證服務尚未準備好。' });
      return false;
    }
    setLoading(true);
    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const result = await signInWithEmailAndPassword(firebaseAuth, email, password);
      await updateUserProfileInFirestore(result.user);
      toast({ title: '登入成功' });
      return true;
    } catch (error: any) {
      console.error("Email sign-in failed", error);
      let description = '發生未知錯誤，請稍後再試。';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = '電子郵件或密碼不正確。';
      } else if (error.code === 'auth/invalid-api-key' || error.code === 'auth/api-key-not-valid') {
        description = 'Firebase 設定無效，請聯絡管理員。'
      }
      toast({ variant: 'destructive', title: '登入失敗', description });
      setLoading(false); // Make sure to set loading false on error
      return false;
    }
  }, [firebaseAuth, toast, updateUserProfileInFirestore]);

  const signupWithEmail = useCallback(async (email: string, password: string): Promise<boolean> => {
    if (!firebaseAuth) {
      toast({ variant: 'destructive', title: '錯誤', description: '認證服務尚未準備好。' });
      return false;
    }
    setLoading(true);
    try {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      const result = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      await updateUserProfileInFirestore(result.user);
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
      } else if (error.code === 'auth/invalid-api-key' || error.code === 'auth/api-key-not-valid') {
        description = 'Firebase 設定無效，請聯絡管理員。'
      }
      toast({ variant: 'destructive', title: '註冊失敗', description });
      setLoading(false); // Make sure to set loading false on error
      return false;
    }
  }, [firebaseAuth, toast, updateUserProfileInFirestore]);

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
