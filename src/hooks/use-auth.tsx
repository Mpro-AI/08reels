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
  setUserRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Re-introducing mock user data for local testing
const mockUsers: User[] = [
    { id: 'user-admin', name: 'Admin User', role: 'admin', pin: '2652' },
    { id: 'user-employee-a', name: '員工 A', role: 'employee', pin: '3768' },
    { id: 'user-employee-b', name: '員工 B', role: 'employee', pin: '9564' },
];

const getInitialUser = () => {
    if (typeof window === 'undefined') return null;
    // Automatically log in as admin for developer mode
    const adminUser = mockUsers.find(u => u.role === 'admin');
    return adminUser || null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // This effect now only runs once on mount to set the initial user
    setUser(getInitialUser());
    setLoading(false);
  }, []);
  
  const isAuthenticated = !!user;

  const login = useCallback(async (pin: string): Promise<boolean> => {
    const foundUser = mockUsers.find(u => u.pin === pin);
    
    if (foundUser) {
      setLoading(true);
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
  
  const setUserRole = useCallback((role: UserRole) => {
    const foundUser = mockUsers.find(u => u.role === role);
    if (foundUser) {
        setLoading(true);
        setUser(foundUser);
        setLoading(false);
    } else {
        console.warn(`No mock user found for role: ${role}`);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loading, login, logout, setUserRole }}>
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
