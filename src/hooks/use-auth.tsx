'use client';
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { User, UserRole } from '@/lib/types';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';


interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
  setUserRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
    if (usersLoading || !firestore) {
        toast({
            variant: "destructive",
            title: "登入錯誤",
            description: "使用者資料尚未載入，請稍後再試。",
        });
        return false;
    }

    const pinQuery = query(collection(firestore, "users"), where("pin", "==", pin));

    try {
      const querySnapshot = await getDocs(pinQuery);
      if (querySnapshot.empty) {
        toast({
            variant: "destructive",
            title: "登入失敗",
            description: "PIN 碼錯誤，請重試。",
        });
        return false;
      }

      const matchedUser = querySnapshot.docs[0].data() as User;
      matchedUser.id = querySnapshot.docs[0].id;
      setUser(matchedUser);
      return true;

    } catch (error) {
      console.error("Error logging in:", error);
      toast({
          variant: "destructive",
          title: "登入錯誤",
          description: "查詢使用者資料時發生問題。",
      });
      return false;
    }

  }, [toast, firestore, usersLoading]);

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
