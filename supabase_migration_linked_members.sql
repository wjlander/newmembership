-- Migration: Linked Members Support
-- Description: Allows multiple membership types per profile and linked member profiles
-- Created: 2025-10-05

-- ============================================================================
-- 1. UPDATE PROFILES TABLE - Add primary_profile_id for linked members
-- ============================================================================

-- Add primary_profile_id column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS primary_profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Create index for faster lookups of linked members
CREATE INDEX IF NOT EXISTS idx_profiles_primary_profile_id ON public.profiles(primary_profile_id);

-- ============================================================================
-- 2. UPDATE MEMBERSHIPS TABLE - Allow multiple membership types per year
-- ============================================================================

-- Drop the old unique constraint that prevented multiple membership types
ALTER TABLE public.memberships 
DROP CONSTRAINT IF EXISTS memberships_organization_id_profile_id_membership_year_key;

-- Create new unique constraint that includes membership_type
-- This allows one profile to have Adult + Associate + Dog memberships in the same year
ALTER TABLE public.memberships
ADD CONSTRAINT memberships_org_profile_year_type_key 
UNIQUE (organization_id, profile_id, membership_year, membership_type);

-- ============================================================================
-- 3. UPDATE RLS POLICIES - Allow primary profiles to access linked member data
-- ============================================================================

-- Allow users to view linked member profiles
DROP POLICY IF EXISTS "Users can view linked member profiles" ON public.profiles;
CREATE POLICY "Users can view linked member profiles"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE id = profiles.primary_profile_id
    )
  );

-- Allow users to view memberships for their linked members
DROP POLICY IF EXISTS "Users can view linked member memberships" ON public.memberships;
CREATE POLICY "Users can view linked member memberships"
  ON public.memberships
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE id = memberships.profile_id
    ) OR
    auth.uid() IN (
      SELECT p1.user_id FROM public.profiles p1
      INNER JOIN public.profiles p2 ON p2.primary_profile_id = p1.id
      WHERE p2.id = memberships.profile_id
    )
  );
