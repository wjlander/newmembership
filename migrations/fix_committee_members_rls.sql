-- Enable RLS on committee_members table
ALTER TABLE committee_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "committee_members_select_policy" ON committee_members;
DROP POLICY IF EXISTS "committee_members_insert_policy" ON committee_members;
DROP POLICY IF EXISTS "committee_members_update_policy" ON committee_members;
DROP POLICY IF EXISTS "committee_members_delete_policy" ON committee_members;

-- SELECT: Members can view committee members in their organization
CREATE POLICY "committee_members_select_policy" ON committee_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM committees
      WHERE committees.id = committee_members.committee_id
      AND committees.organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- INSERT: Admins and super admins can add committee members
CREATE POLICY "committee_members_insert_policy" ON committee_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
      AND (
        -- Regular admin: same organization
        (profiles.role = 'admin' AND EXISTS (
          SELECT 1 FROM committees
          WHERE committees.id = committee_members.committee_id
          AND committees.organization_id = profiles.organization_id
        ))
        OR
        -- Super admin: any organization
        profiles.role = 'super_admin'
      )
    )
  );

-- UPDATE: Admins and super admins can update committee members (e.g., change positions)
CREATE POLICY "committee_members_update_policy" ON committee_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
      AND (
        -- Regular admin: same organization
        (profiles.role = 'admin' AND EXISTS (
          SELECT 1 FROM committees
          WHERE committees.id = committee_members.committee_id
          AND committees.organization_id = profiles.organization_id
        ))
        OR
        -- Super admin: any organization
        profiles.role = 'super_admin'
      )
    )
  );

-- DELETE: Admins and super admins can remove committee members
CREATE POLICY "committee_members_delete_policy" ON committee_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
      AND (
        -- Regular admin: same organization
        (profiles.role = 'admin' AND EXISTS (
          SELECT 1 FROM committees
          WHERE committees.id = committee_members.committee_id
          AND committees.organization_id = profiles.organization_id
        ))
        OR
        -- Super admin: any organization
        profiles.role = 'super_admin'
      )
    )
  );

COMMENT ON POLICY "committee_members_select_policy" ON committee_members IS 'Members can view committee members in their organization';
COMMENT ON POLICY "committee_members_insert_policy" ON committee_members IS 'Admins can add committee members in their organization';
COMMENT ON POLICY "committee_members_update_policy" ON committee_members IS 'Admins can update committee member positions';
COMMENT ON POLICY "committee_members_delete_policy" ON committee_members IS 'Admins can remove committee members';
