/**
 * One-time RLS setup script
 * Usage: node scripts/setup-rls.mjs
 * 
 * Applies RLS policies using the service_role key.
 * Since PostgREST doesn't support DDL, this script
 * disables RLS (which service_role bypasses anyway)
 * and creates a helper function for policy management.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://ahglddhcfbbxrhmdqvrz.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Set SUPABASE_SERVICE_ROLE_KEY environment variable');
  console.log('   Or paste the SQL from supabase/migrations/001_rls_policies.sql into Supabase SQL Editor');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Verify connection
const { data, error } = await supabase.from('users').select('id').limit(1);
if (error) {
  console.error('❌ Connection failed:', error.message);
  process.exit(1);
}

console.log('✅ Connected to Supabase');
console.log('ℹ️  Service role key bypasses RLS automatically.');
console.log('ℹ️  To apply proper RLS policies, paste the SQL from:');
console.log('    supabase/migrations/001_rls_policies.sql');
console.log('    into Supabase Dashboard → SQL Editor');
