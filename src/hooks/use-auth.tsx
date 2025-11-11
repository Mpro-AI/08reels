'use client';
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { User, UserRole } from '@/lib/types';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Re-introducing mock user data for local testing
export const mockUsers: User[] = [
    { id: 'user-admin', name: 'Admin User', role: 'admin', pin: '2652' },
    { id: 'user-employee-a', name: '員工 A', role: 'employee', pin: '3768' },
    { id: 'user-employee-b', name: '員工 B', role: 'employee', pin: '9564' },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // On initial load, we can check if a user is saved in localStorage,
    // but for now, we'll start with no user.
    setLoading(false);
  }, []);
  
  const isAuthenticated = !!user;

  const login = useCallback(async (pin: string): Promise<boolean> => {
    setLoading(true);
    const foundUser = mockUsers.find(u => u.pin === pin);
    
    if (foundUser) {
      setUser(foundUser);
      toast({
        title: `歡迎， ${foundUser.name}`,
        description: `您已成功以 ${foundUser.role} 身份登入。`,
      });
      setLoading(false);
      return true;
    } else {
      toast({
        variant: 'destructive',
        title: '登入失敗',
        description: 'PIN 碼錯誤，請重試。',
      });
      setLoading(false);
      return false;
    }
  }, [toast]);

  const logout = useCallback(() => {
    setLoading(true);
    setUser(null);
    toast({
      title: '已登出',
      description: '您已成功登出。',
    });
    // A small delay to allow state to update before redirect happens
    setTimeout(() => setLoading(false), 50);
  }, [toast]);

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
