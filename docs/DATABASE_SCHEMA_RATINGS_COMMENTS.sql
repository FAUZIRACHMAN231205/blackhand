-- SQL Migration for Ratings and Comments Feature
-- Run these commands in your Supabase SQL Editor
--
-- NOTE: This is the INITIAL schema (Supabase-Auth era). It still creates the
-- required `work_ratings` and `work_comments` tables, BUT the `user_id
-- REFERENCES auth.users(id)` foreign keys and the hardcoded-email RLS policies
-- below are SUPERSEDED by docs/DATABASE_SCHEMA_CUSTOM_AUTH.sql, which swaps the
-- foreign keys to the custom `public.users` table and reworks RLS for the
-- custom-auth model. Run the migrations in the order documented in the README.

-- 1. Create work_ratings Table
CREATE TABLE IF NOT EXISTS public.work_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(work_id, user_id)
);

-- 2. Create work_comments Table
CREATE TABLE IF NOT EXISTS public.work_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT,
  user_avatar TEXT,
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_work_ratings_work_id ON public.work_ratings(work_id);
CREATE INDEX IF NOT EXISTS idx_work_ratings_user_id ON public.work_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_work_comments_work_id ON public.work_comments(work_id);
CREATE INDEX IF NOT EXISTS idx_work_comments_created_at ON public.work_comments(created_at);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.work_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for work_ratings
CREATE POLICY "Allow read access to all authenticated users for ratings" 
  ON public.work_ratings FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow insert/upsert access to rating creator" 
  ON public.work_ratings FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow update access to rating creator" 
  ON public.work_ratings FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow delete access to rating creator" 
  ON public.work_ratings FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- RLS Policies for work_comments
CREATE POLICY "Allow read access to all authenticated users for comments" 
  ON public.work_comments FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow insert access to comment creator" 
  ON public.work_comments FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow delete access to comment creator or admin" 
  ON public.work_comments FOR DELETE 
  TO authenticated 
  USING (
    auth.uid() = user_id OR 
    auth.jwt() ->> 'email' IN (
      'manyungalang@gmail.com',
      'fauzirachman10091985@gmail.com'
    )
  );
