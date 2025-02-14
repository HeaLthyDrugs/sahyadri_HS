import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Regular client for normal operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Participant = {
  id: string;
  attendee_name: string;
  security_checkin: string;
  reception_checkin: string;
  reception_checkout: string;
  security_checkout: string;
  created_at: string;
} 