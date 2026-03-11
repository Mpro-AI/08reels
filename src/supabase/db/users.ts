'use client';
import { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@/lib/types';

function mapDbUser(row: any): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    photoURL: row.photo_url,
    role: row.role,
  };
}

export async function getAllUsers(supabase: SupabaseClient): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*');

  if (error) {
    console.error('Error fetching all users:', error);
    throw error;
  }

  return (data || []).map(mapDbUser);
}

export async function getAllEmployees(supabase: SupabaseClient): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'employee');

  if (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }

  return (data || []).map(mapDbUser);
}
