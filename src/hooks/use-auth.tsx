'use client';
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { User, UserRole } from '@/lib/types';
// import { users } from '@/lib/mock-data'; // Will be replaced by firestore

// This will be replaced by fetching from firestore
const mockUsers: User[] = [
  { id: 'user-1', name: 'Admin User', role: 'admin' },
  { id: 'user-2', name: '員工 A', role: 'employee' },
  { id: 'user-3', name: '員工 B', role: 'employee' },
];

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (pin: string) => boolean;
  logout: () => void;
  setUserRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock PINs for demo purposes
const PINS: Record<string, User> = {
  '2652': mockUsers.find(u => u.role === 'admin')!,
  '3768': mockUsers.find(u => u.role === 'employee' && u.name === '員工 A')!,
  '9564': mockUsers.find(u => u.role === 'employee' && u.name === '員工 B')!,
};


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();

  const login = useCallback((pin: string): boolean => {
    const matchedUser = PINS[pin];
    if (matchedUser) {
      setUser(matchedUser);
      return true;
    } else {
      // Simulate brute-force lockout
      toast({
        variant: "destructive",
        title: "登入失敗",
        description: "PIN 錯誤，請重試。",
      });
      return false;
    }
  }, [toast]);

  const logout = useCallback(() => {
    setUser(null);
  }, []);
  
  const setUserRole = useCallback((role: UserRole) => {
    const newUser = mockUsers.find(u => u.role === role);
    if(newUser) {
      setUser(newUser);
    }
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
