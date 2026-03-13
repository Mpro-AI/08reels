'use client';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../client';
import type { User } from '@/lib/types';

function mapDocToUser(doc: { id: string; data: () => Record<string, unknown> }): User {
  const d = doc.data();
  return {
    id: doc.id,
    name: d.name as string,
    email: d.email as string | undefined,
    photoURL: d.photoURL as string | null | undefined,
    role: d.role as 'admin' | 'employee' | undefined,
  };
}

export async function getAllUsers(): Promise<User[]> {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(mapDocToUser);
}

export async function getAllEmployees(): Promise<User[]> {
  const q = query(collection(db, 'users'), where('role', '==', 'employee'));
  const snap = await getDocs(q);
  return snap.docs.map(mapDocToUser);
}
