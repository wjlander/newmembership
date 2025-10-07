-- Fix RLS policies to allow regular members to view mailing lists, committees, and committee members

-- ============================================================================
-- MAILING LISTS RLS POLICIES
-- ============================================================================

-- Enable RLS on mailing_lists
ALTER TABLE mailing_lists ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "mailing_lists_select_policy" ON mailing_lists;
DROP POLICY IF EXISTS "mailing_lists_admin_policy" ON mailing_lists;

-- SELECT: Members can view active mailing lists in their organization
CREATE POLICY "mailing_lists_select_policy" ON mailing_lists
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
    AND is_active = true
  );

-- ALL: Admins and super admins can manage mailing lists
CREATE POLICY "mailing_lists_admin_policy" ON mailing_lists
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
      AND (
        profiles.role = 'super_admin'
        OR profiles.organization_id = mailing_lists.organization_id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
      AND (
        profiles.role = 'super_admin'
        OR profiles.organization_id = mailing_lists.organization_id
      )
    )
  );

-- ============================================================================
-- MAILING LIST SUBSCRIPTIONS RLS POLICIES
-- ============================================================================

-- Enable RLS on mailing_list_subscriptions
ALTER TABLE mailing_list_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "subscriptions_select_policy" ON mailing_list_subscriptions;
DROP POLICY IF EXISTS "subscriptions_insert_policy" ON mailing_list_subscriptions;
DROP POLICY IF EXISTS "subscriptions_update_policy" ON mailing_list_subscriptions;
DROP POLICY IF EXISTS "subscriptions_delete_policy" ON mailing_list_subscriptions;

-- SELECT: Members can view their own subscriptions
CREATE POLICY "subscriptions_select_policy" ON mailing_list_subscriptions
  FOR SELECT
  USING (
    subscriber_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- INSERT: Members can subscribe themselves
CREATE POLICY "subscriptions_insert_policy" ON mailing_list_subscriptions
  FOR INSERT
  WITH CHECK (
    subscriber_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- UPDATE: Members can update their own subscriptions (e.g., unsubscribe)
CREATE POLICY "subscriptions_update_policy" ON mailing_list_subscriptions
  FOR UPDATE
  USING (
    subscriber_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    subscriber_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- DELETE: Members can delete their own subscriptions
CREATE POLICY "subscriptions_delete_policy" ON mailing_list_subscriptions
  FOR DELETE
  USING (
    subscriber_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- COMMITTEES RLS POLICIES
-- ============================================================================

-- Enable RLS on committees
ALTER TABLE committees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "committees_select_policy" ON committees;
DROP POLICY IF EXISTS "committees_admin_policy" ON committees;

-- SELECT: Members can view committees in their organization
CREATE POLICY "committees_select_policy" ON committees
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- ALL: Admins can manage committees
CREATE POLICY "committees_admin_policy" ON committees
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
      AND (
        profiles.role = 'super_admin'
        OR profiles.organization_id = committees.organization_id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
      AND (
        profiles.role = 'super_admin'
        OR profiles.organization_id = committees.organization_id
      )
    )
  );

COMMENT ON POLICY "mailing_lists_select_policy" ON mailing_lists IS 'Members can view active mailing lists in their organization';
COMMENT ON POLICY "mailing_lists_admin_policy" ON mailing_lists IS 'Admins can manage all mailing lists';
COMMENT ON POLICY "subscriptions_select_policy" ON mailing_list_subscriptions IS 'Members can view their own subscriptions';
COMMENT ON POLICY "subscriptions_insert_policy" ON mailing_list_subscriptions IS 'Members can subscribe to mailing lists';
COMMENT ON POLICY "subscriptions_update_policy" ON mailing_list_subscriptions IS 'Members can update their subscriptions';
COMMENT ON POLICY "subscriptions_delete_policy" ON mailing_list_subscriptions IS 'Members can unsubscribe from mailing lists';
COMMENT ON POLICY "committees_select_policy" ON committees IS 'Members can view committees in their organization';
COMMENT ON POLICY "committees_admin_policy" ON committees IS 'Admins can manage committees';
