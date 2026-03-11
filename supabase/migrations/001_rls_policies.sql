-- 001: RLS Policies for all tables
-- Run this in Supabase SQL Editor (one-time setup)

-- ============================================
-- USERS table
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all users (needed for UI)
CREATE POLICY "Authenticated users can read all users"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- ============================================
-- VIDEOS table
-- ============================================
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all non-deleted videos
CREATE POLICY "Authenticated users can read videos"
  ON public.videos FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert videos
CREATE POLICY "Authenticated users can insert videos"
  ON public.videos FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update videos
CREATE POLICY "Authenticated users can update videos"
  ON public.videos FOR UPDATE
  TO authenticated
  USING (true);

-- Authenticated users can delete videos
CREATE POLICY "Authenticated users can delete videos"
  ON public.videos FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- VERSIONS table
-- ============================================
ALTER TABLE public.versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read versions"
  ON public.versions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert versions"
  ON public.versions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update versions"
  ON public.versions FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete versions"
  ON public.versions FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- COMMENTS table
-- ============================================
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read comments"
  ON public.comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert comments"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update comments"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete comments"
  ON public.comments FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- ANNOTATIONS table
-- ============================================
ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read annotations"
  ON public.annotations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert annotations"
  ON public.annotations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update annotations"
  ON public.annotations FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete annotations"
  ON public.annotations FOR DELETE
  TO authenticated
  USING (true);
