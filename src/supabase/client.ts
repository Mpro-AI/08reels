'use client';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ahglddhcfbbxrhmdqvrz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoZ2xkZGhjZmJieHJobWRxdnJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMDQyMzgsImV4cCI6MjA4ODc4MDIzOH0.jbk4_2jSQkIpTpzJilmLM01k52wb5Bd0_5f-IzgPW9c';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
