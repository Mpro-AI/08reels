'use client';
import {
  collection,
  query,
  where,
  getDocs,
  Firestore,
} from 'firebase/firestore';
import type { User } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export async function getAllUsers(db: Firestore): Promise<User[]> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  } catch (error) {
    console.error('Error fetching all users:', error);
    const permissionError = new FirestorePermissionError({
      path: 'users',
      operation: 'list',
    });
    errorEmitter.emit('permission-error', permissionError);
    throw error;
  }
}


export async function getAllEmployees(db: Firestore): Promise<User[]> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'employee'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  } catch (error) {
    console.error('Error fetching employees:', error);
    const permissionError = new FirestorePermissionError({
      path: 'users',
      operation: 'list',
    });
    errorEmitter.emit('permission-error', permissionError);
    throw error;
  }
}
