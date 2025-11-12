
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
import type { User } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useAuth } from '@/hooks/use-auth';

export function UserManagementTable() {
  const firestore = useFirestore();
  const { user: currentUser } = useAuth();
  const usersQuery = useMemo(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: users, loading } = useCollection<User>(usersQuery);
  const { toast } = useToast();

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'employee') => {
    if (!firestore || !currentUser) return;
    
    // Prevent admin from demoting themselves if they are the only admin
    const admins = users?.filter(u => u.role === 'admin');
    if (currentUser.id === userId && newRole !== 'admin' && admins?.length === 1) {
        toast({
            variant: 'destructive',
            title: '操作失敗',
            description: '無法移除最後一位管理員的權限。',
        });
        return;
    }

    const userRef = doc(firestore, 'users', userId);
    try {
      await updateDoc(userRef, { role: newRole });
      toast({
        title: '成功',
        description: `已更新使用者角色。`,
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      const permissionError = new FirestorePermissionError({
        path: userRef.path,
        operation: 'update',
        requestResourceData: { role: newRole },
      });
      errorEmitter.emit('permission-error', permissionError);
      // Let the central listener handle the toast
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名稱</TableHead>
            <TableHead>電子郵件</TableHead>
            <TableHead className="w-[150px]">角色</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users && users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Select
                  value={user.role}
                  onValueChange={(value: 'admin' | 'employee') => handleRoleChange(user.id, value)}
                  disabled={user.id === currentUser?.id && users.filter(u => u.role === 'admin').length === 1}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選擇角色" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">管理員</SelectItem>
                    <SelectItem value="employee">員工</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
