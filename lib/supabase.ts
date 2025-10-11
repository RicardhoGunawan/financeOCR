import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Transaction = {
  id: number;
  user_id: string;
  category_id: number | null;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  note: string | null;
  source: 'manual' | 'ocr';
  created_at: string;
  updated_at: string;
  category?: Category;
};

export type Category = {
  id: number;
  user_id: string;
  name: string;
  type: 'income' | 'expense';
  created_at: string;
};

export type UserProfile = {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  currency: string;
  created_at: string;
  updated_at: string;
};

export type OcrRecord = {
  id: number;
  user_id: string;
  file_name: string;
  file_url: string | null;
  extracted_text: string | null;
  parsed_amount: number | null;
  parsed_date: string | null;
  created_at: string;
};
