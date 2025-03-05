import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Regular client for normal operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types based on your SQL schema
export interface BillingEntry {
  id: string;
  program_id: string | null;
  package_id: string | null;
  product_id: string | null;
  entry_date: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface Package {
  id: string;
  name: string;
  description: string | null;
  type: string;
  created_at: string;
  updated_at: string;
}

export type Participant = {
  id: string;
  attendee_name: string;
  security_checkin: string;
  reception_checkin: string;
  reception_checkout: string;
  security_checkout: string;
  created_at: string;
} 