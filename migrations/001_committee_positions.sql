-- Migration: Add Committee Positions Feature
-- Run this in your Supabase SQL Editor to add committee positions to your production database

-- 1. Create committees table (if not exists)
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

CREATE INDEX IF NOT EXISTS idx_committee_members_committee_id ON committee_members(committee_id);
CREATE INDEX IF NOT EXISTS idx_committee_members_profile_id ON committee_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_committee_members_position_id ON committee_members(position_id);
CREATE UNIQUE INDEX IF NOT EXISTS committee_members_committee_id_profile_id_key ON committee_members(committee_id, profile_id);

-- 4. Seed default committee positions for your organization
-- Replace 'YOUR_ORG_ID' with your actual organization ID, or use the slug-based query below

-- Option A: If you know your organization ID:
-- INSERT INTO committee_positions (organization_id, name, description, display_order, is_active)
-- VALUES 
--   ('YOUR_ORG_ID', 'Chairman', 'Committee chairman/chairperson - leads meetings and overall direction', 1, true),
--   ('YOUR_ORG_ID', 'Vice Chairman', 'Deputy chairman - assists chairman and acts as backup', 2, true),
--   ('YOUR_ORG_ID', 'Secretary', 'Manages records, minutes, and communications', 3, true),
--   ('YOUR_ORG_ID', 'Treasurer', 'Manages finances, budgets, and financial reporting', 4, true),
--   ('YOUR_ORG_ID', 'Membership Secretary', 'Handles member applications, renewals, and member communications', 5, true),
--   ('YOUR_ORG_ID', 'Member', 'General committee member without specific role', 10, true);

-- Option B: Use slug to find organization ID automatically (recommended):
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

-- 5. Grant necessary RLS policies (adjust based on your security model)
-- You may need to add RLS policies if you have Row Level Security enabled

-- Example RLS policies (customize as needed):
-- ALTER TABLE committees ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE committee_positions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE committee_members ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage committees
-- CREATE POLICY "Admins can manage committees" ON committees
--   FOR ALL USING (
--     EXISTS (
--       SELECT 1 FROM profiles 
--       WHERE profiles.id = auth.uid() 
--       AND profiles.organization_id = committees.organization_id 
--       AND profiles.role IN ('admin', 'super_admin')
--     )
--   );

-- Similar policies for committee_positions and committee_members...

-- Migration complete!
-- Now you can use the Committee Positions feature in your application.
