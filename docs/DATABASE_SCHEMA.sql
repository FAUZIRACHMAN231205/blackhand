-- BLACKHAND Digital Identity System - Supabase Schema Setup
-- Run these SQL commands in your Supabase SQL Editor

-- 1. User Profiles Table (to extend Supabase auth users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT email_lowercase CHECK (email = LOWER(email))
);

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL,
  status TEXT DEFAULT 'draft', -- draft, published, archived
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT status_check CHECK (status IN ('draft', 'published', 'archived')),
  UNIQUE(user_id, slug)
);

-- 3. Project Items Table
CREATE TABLE IF NOT EXISTS public.project_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. User Activity/Analytics Table
CREATE TABLE IF NOT EXISTS public.user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- login, view, create, update, delete
  activity_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Settings Table
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  theme TEXT DEFAULT 'dark', -- light, dark, auto
  notifications_enabled BOOLEAN DEFAULT TRUE,
  email_updates BOOLEAN DEFAULT TRUE,
  privacy_level TEXT DEFAULT 'private', -- private, friends, public
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_project_items_project_id ON public.project_items(project_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON public.user_activity(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile" 
  ON public.user_profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.user_profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
  ON public.user_profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- RLS Policies for projects
CREATE POLICY "Users can view their own projects" 
  ON public.projects FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert projects" 
  ON public.projects FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" 
  ON public.projects FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" 
  ON public.projects FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for project_items
CREATE POLICY "Users can manage their project items" 
  ON public.project_items FOR ALL 
  USING (
    project_id IN (
      SELECT id FROM public.projects 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for user_settings
CREATE POLICY "Users can view their own settings" 
  ON public.user_settings FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own settings" 
  ON public.user_settings FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own settings" 
  ON public.user_settings FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Create a trigger function to automatically create user_profiles on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT DO NOTHING;
  
  INSERT INTO public.user_settings (id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function after user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create views for easier querying
CREATE OR REPLACE VIEW public.user_profile_with_stats AS
SELECT 
  up.id,
  up.email,
  up.full_name,
  up.avatar_url,
  up.bio,
  COUNT(DISTINCT p.id) as project_count,
  COUNT(DISTINCT CASE WHEN p.status = 'published' THEN p.id END) as published_projects,
  up.created_at,
  up.updated_at
FROM public.user_profiles up
LEFT JOIN public.projects p ON up.id = p.user_id
GROUP BY up.id, up.email, up.full_name, up.avatar_url, up.bio, up.created_at, up.updated_at;
