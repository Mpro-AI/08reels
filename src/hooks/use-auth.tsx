'use client';
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { User } from '@/lib/types';
import { 
  useAuth as useFirebaseAuth 
} from '@/firebase';
import {
  signInAnonymously,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const mockUsers: User[] = [
    { id: 'user-admin', name: 'Admin User', role: 'admin', pin: '2652' },
    { id: 'user-employee-a', name: '員工 A', role: 'employee', pin: '3768' },
    { id: 'user-employee-b', name: '員工 B', role: 'employee', pin: '9564' },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const firebaseAuth = useFirebaseAuth();

  useEffect(() => {
    if (!firebaseAuth) {
      setLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
      // If there is a firebase user but no local user, it means the page was reloaded.
      // For this mock setup, we'll just log out. A real app might persist the user role.
      if (firebaseUser && !user) {
        // To keep it simple, if there's a Firebase session but no local PIN-based user,
        // we'll sign out to force a PIN login again on refresh.
        signOut(firebaseAuth);
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firebaseAuth, user]);
  
  const isAuthenticated = !!user;

  const login = useCallback(async (pin: string): Promise<boolean> => {
    setLoading(true);
    const foundUser = mockUsers.find(u => u.pin === pin);
    
    if (foundUser && firebaseAuth) {
      try {
        await signInAnonymously(firebaseAuth);
        setUser(foundUser);
        toast({
          title: `歡迎， ${foundUser.name}`,
          description: `您已成功以 ${foundUser.role} 身份登入。`,
        });
        setLoading(false);
        return true;
      } catch (error) {
        console.error("Firebase anonymous sign-in failed", error);
        toast({
          variant: 'destructive',
          title: '登入失敗',
          description: '無法與認證服務連線。',
        });
        setLoading(false);
        return false;
      }
    } else {
      toast({
        variant: 'destructive',
        title: '登入失敗',
        description: 'PIN 碼錯誤，請重試。',
      });
      setLoading(false);
      return false;
    }
  }, [toast, firebaseAuth]);

  const logout = useCallback(async () => {
    setLoading(true);
    if (firebaseAuth) {
      await signOut(firebaseAuth);
    }
    setUser(null);
    toast({
      title: '已登出',
      description: '您已成功登出。',
    });
    setTimeout(() => setLoading(false), 50);
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
