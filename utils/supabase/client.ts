import { createBrowserClient } from '@supabase/ssr';

// Client-side Supabase client, safe to import in any 'use client' component.
export function createClient() {
  return createBrowserClient(
   "https://orkzotrsgyfabeysqzjx.supabase.co/auth/v1/callback",
   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ya3pvdHJzZ3lmYWJleXNxemp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5Nzg3NTksImV4cCI6MjEwMDU1NDc1OX0.KqQKOVJQ6qrsSbC1z2m2BwazdTB04aoIwgnaF_RUs7Y"
  );
}

export const supabase = createClient();
