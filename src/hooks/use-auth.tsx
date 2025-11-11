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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();
  const firestore = useFirestore();

  useEffect(() => {
    const seedInitialUsers = async () => {
        if (!firestore) return;
        const usersCollection = collection(firestore, 'users');
        const snapshot = await getDocs(usersCollection);
        if (snapshot.empty) {
            console.log('No users found, seeding initial data...');
            const batch = writeBatch(firestore);
            initialUsers.forEach(userData => {
                const userRef = doc(usersCollection);
                batch.set(userRef, userData);
            });
            await batch.commit();
            console.log('Initial users seeded.');
        } else {
            console.log('Users collection is not empty.');
        }
    };
    seedInitialUsers().catch(console.error);
  }, [firestore]);


  const login = useCallback(async (pin: string): Promise<boolean> => {
    if (!firestore) {
        toast({
            variant: "destructive",
            title: "登入錯誤",
            description: "資料庫連線失敗，請稍後再試。",
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

      const matchedUser = querySnapshot.docs[0].data() as Omit<User, 'id'>;
      const userWithId: User = {
        id: querySnapshot.docs[0].id,
        ...matchedUser
      };
      
      setUser(userWithId);
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

  }, [toast, firestore]);

  const logout = useCallback(() => {
    setUser(null);
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
