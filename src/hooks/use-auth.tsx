'use client';
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { User, UserRole } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { doc } from 'firebase/firestore';


interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
  setUserRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const initialUsers: Omit<User, 'id'>[] = [
    { name: 'Admin User', role: 'admin', pin: '2652' },
    { name: '員工 A', role: 'employee', pin: '3768' },
    { name: '員工 B', role: 'employee', pin: '9564' },
];

const adminUserForTesting: User = {
  id: 'admin-test-id',
  name: 'Admin User',
  role: 'admin',
  pin: '2652'
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();
  const firestore = useFirestore();

  useEffect(() => {
    // Set user to admin for UI testing
    setUser(adminUserForTesting);
  }, []);


  const login = useCallback(async (pin: string): Promise<boolean> => {
    // This is now a mock login as we are always logged in as admin
    toast({
        title: "開發者模式",
        description: "已自動以管理員身份登入。",
    });
    return true;
  }, [toast]);

  const logout = useCallback(() => {
    // For testing, logout will also just set the user back to admin
    setUser(adminUserForTesting);
    toast({
      title: '開發者模式',
      description: '已重新登入為管理員。',
    });
  }, []);
  
  const setUserRole = useCallback((role: UserRole) => {
    // This is a mock function for now. In a real app, you'd fetch the user by role.
    console.log("Switching to user with role:", role);
  }, []);

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
