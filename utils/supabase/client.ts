import { createBrowserClient } from '@supabase/ssr';

// Client-side Supabase client, safe to import in any 'use client' component.
export function createClient() {
  return createBrowserClient(
   "https://orkzotrsgyfabeysqzjx.supabase.co",
"sb_publishable_GjYC1ctm-MekB4jhlCXcig_d14gdDPb"  );
}

export const supabase = createClient();
