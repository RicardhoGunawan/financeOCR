import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Wallet = {
  id: number;
  user_id: string;
  name: string;
  type: 'cash' | 'bank' | 'e-wallet' | 'credit-card' | 'investment' | 'other';
  balance: number;
  currency: string;
  icon: string | null;
  color: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type WalletWithStats = Wallet & {
  transaction_count: number;
  total_income: number;
  total_expense: number;
};

export type WalletTransfer = {
  id: number;
  user_id: string;
  from_wallet_id: number;
  to_wallet_id: number;
  amount: number;
  note: string | null;
  created_at: string;
  from_wallet?: Wallet;
  to_wallet?: Wallet;
};

export type Transaction = {
  id: number;
  user_id: string;
  category_id: number | null;
  wallet_id: number | null;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  note: string | null;
  source: 'manual' | 'ocr';
  created_at: string;
  updated_at: string;
  category?: Category;
  wallet?: Wallet;
};

export type Category = {
  id: number;
  user_id: string;
  name: string;
  type: 'income' | 'expense';
  created_at: string;
};

export type Budget = {
  id: number;
  user_id: string;
  category_id: number;
  amount: number;
  month: number; // 1-12
  year: number;
  created_at: string;
  updated_at: string;
  category?: Category;
};

export type BudgetWithSpent = Budget & {
  spent: number;
  percentage: number;
  remaining: number;
};

export type Insight = {
  id: number;
  user_id: string;
  title: string;
  description: string;
  insight_type: 'spending' | 'saving' | 'budget' | 'trend' | 'subscription' | 'general';
  severity: 'info' | 'warning' | 'success' | 'critical';
  period_start: string;
  period_end: string;
  metadata: Record<string, any> | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
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