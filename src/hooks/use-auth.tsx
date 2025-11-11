'use client';
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { User, UserRole } from '@/lib/types';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';


interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
  setUserRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock PINs for demo purposes - we will fetch users from Firestore
const PINS: Record<string, string> = {
  '2652': 'Admin User',
  '3768': '員工 A',
  '9564': '員工 B',
};


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();
  const firestore = useFirestore();

  const usersQuery = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);

  const { data: users, loading: usersLoading } = useCollection<User>(usersQuery);

  const login = useCallback(async (pin: string): Promise<boolean> => {
    if (usersLoading || !users) {
        toast({
            variant: "destructive",
            title: "登入錯誤",
            description: "使用者資料尚未載入，請稍後再試。",
        });
        return false;
    }

    const userNameToFind = PINS[pin];
    if (userNameToFind) {
      const matchedUser = users.find(u => u.name === userNameToFind);
      if (matchedUser) {
        setUser(matchedUser);
        return true;
      }
    }
    
    toast({
        variant: "destructive",
        title: "登入失敗",
        description: "PIN 錯誤，請重試。",
    });
    return false;

  }, [toast, users, usersLoading]);

  const logout = useCallback(() => {
    setUser(null);
  }, []);
  
  const setUserRole = useCallback((role: UserRole) => {
    if (users) {
        const newUser = users.find(u => u.role === role);
        if(newUser) {
          setUser(newUser);
        }
    }
  }, [users]);

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, logout, setUserRole }}>
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
