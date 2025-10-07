-- ============================================================================
-- COMPLETE MIGRATION: Committee Positions + Email Workflows
-- ============================================================================
-- Run this ENTIRE file in your Supabase SQL Editor to add both features
-- to your production database for "Fairbourne Railway Preservation Society"
-- ============================================================================

-- ============================================================================
-- PART 1: COMMITTEE POSITIONS FEATURE
-- ============================================================================

-- 1. Create committees table
CREATE TABLE IF NOT EXISTS committees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL,
  mailing_list_id TEXT,
  is_active BOOLEAN DEFAULT true,
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_committees_organization_id ON committees(organization_id);
CREATE INDEX IF NOT EXISTS idx_committees_slug ON committees(slug);
CREATE UNIQUE INDEX IF NOT EXISTS committees_organization_id_slug_key ON committees(organization_id, slug);

-- 2. Create committee_positions table
CREATE TABLE IF NOT EXISTS committee_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_committee_positions_organization_id ON committee_positions(organization_id);
CREATE INDEX IF NOT EXISTS idx_committee_positions_display_order ON committee_positions(display_order);
CREATE UNIQUE INDEX IF NOT EXISTS committee_positions_organization_id_name_key ON committee_positions(organization_id, name);

-- 3. Create committee_members table
CREATE TABLE IF NOT EXISTS committee_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  position_id UUID REFERENCES committee_positions(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add position_id column if it doesn't exist (for existing tables)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'committee_members' AND column_name = 'position_id'
  ) THEN
    ALTER TABLE committee_members ADD COLUMN position_id UUID REFERENCES committee_positions(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_committee_members_committee_id ON committee_members(committee_id);
CREATE INDEX IF NOT EXISTS idx_committee_members_profile_id ON committee_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_committee_members_position_id ON committee_members(position_id);

-- Drop old unique constraint if it exists (it had position_id which caused issues)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'committee_members_committee_id_profile_id_position_id_key'
  ) THEN
    ALTER TABLE committee_members DROP CONSTRAINT committee_members_committee_id_profile_id_position_id_key;
  END IF;
END $$;

-- Create new unique constraint (committee_id + profile_id only)
CREATE UNIQUE INDEX IF NOT EXISTS committee_members_committee_id_profile_id_key ON committee_members(committee_id, profile_id);

-- 3a. Enable RLS on committee_members table
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

-- UPDATE: Admins and super admins can update committee members
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
  )
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

-- 4. Seed default committee positions for Fairbourne Railway Preservation Society
INSERT INTO committee_positions (organization_id, name, description, display_order, is_active)
SELECT 
  id as organization_id,
  position_name,
  position_description,
  position_order,
  true as is_active
FROM organizations,
  (VALUES
    ('Chairman', 'Committee chairman/chairperson - leads meetings and overall direction', 1),
    ('Vice Chairman', 'Deputy chairman - assists chairman and acts as backup', 2),
    ('Secretary', 'Manages records, minutes, and communications', 3),
    ('Treasurer', 'Manages finances, budgets, and financial reporting', 4),
    ('Membership Secretary', 'Handles member applications, renewals, and member communications', 5),
    ('Member', 'General committee member without specific role', 10)
  ) AS positions(position_name, position_description, position_order)
WHERE organizations.name = 'Fairbourne Railway Preservation Society'
ON CONFLICT (organization_id, name) DO NOTHING;

-- ============================================================================
-- PART 2: EMAIL WORKFLOWS WITH POSITION SUPPORT
-- ============================================================================

-- 5. Create email_workflows table with position-based recipients
CREATE TABLE IF NOT EXISTS email_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL,
  conditions JSONB DEFAULT '{}'::jsonb,
  recipient_type TEXT NOT NULL DEFAULT 'email',
  recipient_email TEXT,
  recipient_name TEXT,
  recipient_position_id UUID REFERENCES committee_positions(id) ON DELETE SET NULL,
  email_subject TEXT NOT NULL,
  email_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add new columns if they don't exist (for existing tables)
DO $$ 
BEGIN
  -- Add recipient_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_workflows' AND column_name = 'recipient_type'
  ) THEN
    ALTER TABLE email_workflows ADD COLUMN recipient_type TEXT NOT NULL DEFAULT 'email';
  END IF;
  
  -- Add recipient_position_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_workflows' AND column_name = 'recipient_position_id'
  ) THEN
    ALTER TABLE email_workflows ADD COLUMN recipient_position_id UUID REFERENCES committee_positions(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_workflows_organization_id ON email_workflows(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_workflows_recipient_position_id ON email_workflows(recipient_position_id);

-- Add constraint to ensure proper recipient configuration (using DO block for IF NOT EXISTS)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_recipient_config'
  ) THEN
    ALTER TABLE email_workflows ADD CONSTRAINT check_recipient_config
      CHECK (
        (recipient_type = 'email' AND recipient_email IS NOT NULL) OR
        (recipient_type = 'position' AND recipient_position_id IS NOT NULL) OR
        (recipient_type = 'all_members')
      );
  END IF;
END $$;

COMMENT ON TABLE email_workflows IS 'Automated email workflows triggered by member actions';
COMMENT ON COLUMN email_workflows.recipient_type IS 'Type of recipient: email (specific email), position (committee position holder), or all_members';
COMMENT ON COLUMN email_workflows.recipient_position_id IS 'Committee position to send email to (e.g., Membership Secretary, Treasurer)';
COMMENT ON COLUMN email_workflows.trigger_event IS 'Event that triggers the workflow: signup, renewal, or both';

-- ============================================================================
-- MIGRATION COMPLETE!
-- ============================================================================
-- You now have:
-- 1. Committee management with custom positions
-- 2. Email workflows that can send to position holders
-- 3. Default positions (Chairman, Secretary, Treasurer, etc.) for your organization
--
-- Next steps:
-- 1. Go to Admin Menu → Committee Positions to manage positions
-- 2. Go to Admin Menu → Committees Management to create committees and assign members
-- 3. Go to Admin Menu → Email Workflows to create automated emails
-- ============================================================================
