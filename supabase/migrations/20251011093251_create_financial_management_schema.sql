/*
  # Financial Management Application Schema

  ## Overview
  This migration creates the complete database schema for a financial management application
  with OCR capabilities, including user profiles, categories, transactions, and OCR records.

  ## New Tables
  
  ### 1. user_profiles
  - `id` (uuid, primary key) - Unique identifier for the profile
  - `user_id` (uuid, foreign key) - References auth.users.id
  - `full_name` (text) - User's full name
  - `avatar_url` (text) - URL to user's avatar image
  - `currency` (text) - User's preferred currency (default: USD)
  - `created_at` (timestamptz) - Profile creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. categories
  - `id` (serial, primary key) - Unique identifier for the category
  - `user_id` (uuid, foreign key) - References auth.users.id
  - `name` (text) - Category name
  - `type` (text) - Either 'income' or 'expense'
  - `created_at` (timestamptz) - Category creation timestamp

  ### 3. transactions
  - `id` (bigserial, primary key) - Unique identifier for the transaction
  - `user_id` (uuid, foreign key) - References auth.users.id
  - `category_id` (integer, foreign key) - References categories.id
  - `title` (text) - Transaction title/description
  - `amount` (numeric) - Transaction amount
  - `type` (text) - Either 'income' or 'expense'
  - `date` (date) - Transaction date
  - `note` (text) - Additional notes
  - `source` (text) - Either 'manual' or 'ocr'
  - `created_at` (timestamptz) - Transaction creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 4. ocr_records
  - `id` (bigserial, primary key) - Unique identifier for the OCR record
  - `user_id` (uuid, foreign key) - References auth.users.id
  - `file_name` (text) - Original filename
  - `file_url` (text) - URL to stored file
  - `extracted_text` (text) - Full extracted text from OCR
  - `parsed_amount` (numeric) - Extracted amount value
  - `parsed_date` (date) - Extracted date
  - `created_at` (timestamptz) - Record creation timestamp

  ## Security
  - Row Level Security (RLS) is enabled on all tables
  - Users can only access their own data via auth.uid() policies
  - Policies cover SELECT, INSERT, UPDATE, and DELETE operations
  - All policies require authentication

  ## Important Notes
  1. All tables use RLS to ensure data isolation between users
  2. Foreign key constraints maintain referential integrity
  3. Timestamps use timestamptz for timezone awareness
  4. Default values are provided where appropriate
  5. Cascading deletes are configured for dependent records
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  currency text DEFAULT 'USD',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id serial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  created_at timestamptz DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id integer REFERENCES categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  amount numeric(15, 2) NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  date date NOT NULL,
  note text,
  source text DEFAULT 'manual' CHECK (source IN ('manual', 'ocr')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create ocr_records table
CREATE TABLE IF NOT EXISTS ocr_records (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_url text,
  extracted_text text,
  parsed_amount numeric(15, 2),
  parsed_date date,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_ocr_records_user_id ON ocr_records(user_id);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for categories
CREATE POLICY "Users can view own categories"
  ON categories FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON categories FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for ocr_records
CREATE POLICY "Users can view own OCR records"
  ON ocr_records FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own OCR records"
  ON ocr_records FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own OCR records"
  ON ocr_records FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own OCR records"
  ON ocr_records FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();