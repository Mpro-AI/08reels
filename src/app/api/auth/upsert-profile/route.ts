import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Server-side route: uses service_role key to bypass RLS
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ahglddhcfbbxrhmdqvrz.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoZ2xkZGhjZmJieHJobWRxdnJ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzIwNDIzOCwiZXhwIjoyMDg4NzgwMjM4fQ.EjTEdcjyJSun-zIVN9Xs8vj_cgf3fHRARWPjMjxOm7E';
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

export async function POST(req: NextRequest) {
  try {
    // Verify the user's JWT from the request
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check existing user
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (existingUser) {
      // Update name/email
      await supabaseAdmin
        .from('users')
        .update({
          name: existingUser.name || user.email?.split('@')[0] || 'Anonymous',
          email: user.email,
        })
        .eq('id', user.id);

      return NextResponse.json({
        id: existingUser.id,
        name: existingUser.name || user.email?.split('@')[0] || 'Anonymous',
        email: existingUser.email || user.email,
        photoURL: existingUser.photo_url,
        role: existingUser.role === 'admin' ? 'admin' : 'employee',
      });
    } else {
      // New user — default employee
      const name = user.email?.split('@')[0] || 'Anonymous';
      await supabaseAdmin
        .from('users')
        .insert({
          id: user.id,
          name,
          email: user.email,
          photo_url: null,
          role: 'employee',
        });

      return NextResponse.json({
        id: user.id,
        name,
        email: user.email,
        photoURL: null,
        role: 'employee',
      });
    }
  } catch (err: any) {
    console.error('[upsert-profile]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
