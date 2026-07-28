import { createClient } from '@supabase/supabase-js';

// Replace with your actual Supabase project URL and anon key
const SUPABASE_URL = 'https://orkzotrsgyfabeysqzjx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_GjYC1ctm-MekB4jhlCXcig_d14gdDPb';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);