import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Browser-safe client — uses anon key, respects RLS. Use in React components. */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
