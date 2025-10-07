-- ============================================================================
-- ADD PERMISSIONS TO COMMITTEE POSITIONS
-- ============================================================================
-- This migration adds a permissions system to committee positions, allowing
-- granular access control based on position assignments.
--
-- Available permissions:
-- - approve_members: Can approve/reject member applications
-- - manage_members: Can edit member details
-- - manage_memberships: Can create/edit/delete membership records
-- - view_reports: Can view reports
-- - export_reports: Can export reports (CSV, etc.)
-- - manage_events: Can create/edit/delete events
-- - manage_emails: Can send email campaigns
-- - manage_mailing_lists: Can create/edit mailing lists
-- - manage_committees: Can create/edit committees and positions
-- - manage_settings: Can edit organization settings
-- - manage_domains: Can manage custom domains
-- - full_admin: Has all permissions (equivalent to admin role)
-- ============================================================================

-- Add permissions column to committee_positions
ALTER TABLE committee_positions 
ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '[]'::jsonb;

-- Add comment to explain the permissions column
COMMENT ON COLUMN committee_positions.permissions IS 
'Array of permission strings that this position grants. Valid permissions: approve_members, manage_members, manage_memberships, view_reports, export_reports, manage_events, manage_emails, manage_mailing_lists, manage_committees, manage_settings, manage_domains, full_admin';

-- Example: Set Chairman position to have full admin access
-- UPDATE committee_positions 
-- SET permissions = '["full_admin"]'::jsonb 
-- WHERE name ILIKE '%chairman%' OR name ILIKE '%president%';

-- Example: Set Membership Secretary position to have member management permissions
-- UPDATE committee_positions 
-- SET permissions = '["approve_members", "manage_members", "manage_memberships", "view_reports", "export_reports"]'::jsonb 
-- WHERE name ILIKE '%membership%secretary%';

-- Example: Set Treasurer position to have reports access
-- UPDATE committee_positions 
-- SET permissions = '["view_reports", "export_reports"]'::jsonb 
-- WHERE name ILIKE '%treasurer%';
