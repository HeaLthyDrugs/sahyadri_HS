import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

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