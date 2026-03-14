'use client';
import { useState } from 'react';
import { useSupabase, useCollection } from '@/supabase';
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
import { useAuth } from '@/hooks/use-auth';

export function UserManagementTable() {
  const supabase = useSupabase();
  const { user: currentUser } = useAuth();
  const { data: users, loading } = useCollection<User>({ table: 'users', enabled: true });
  const { toast } = useToast();

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'employee') => {
    if (!currentUser) return;

    const admins = users?.filter((u: User) => u.role === 'admin');
    if (currentUser.id === userId && newRole !== 'admin' && admins?.length === 1) {
      toast({
        variant: 'destructive',
        title: '操作失敗',
        description: '無法移除最後一位管理員的權限。',
      });
      return;
    }

    try {
      await supabase.from('users').update({ role: newRole }).eq('id', userId);
      toast({
        title: '成功',
        description: '已更新使用者角色。',
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        variant: 'destructive',
        title: '操作失敗',
        description: '更新角色時發生錯誤。',
      });
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
          {users && users.map((user: User) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Select
                  value={user.role}
                  onValueChange={(value: 'admin' | 'employee') => handleRoleChange(user.id, value)}
                  disabled={user.id === currentUser?.id && users.filter((u: User) => u.role === 'admin').length === 1}
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
