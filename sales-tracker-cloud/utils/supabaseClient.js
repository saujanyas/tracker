import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only create the client if the keys exist
export const supabase = (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your_supabase_url') 
    ? createClient(supabaseUrl, supabaseAnonKey) 
    : null;
