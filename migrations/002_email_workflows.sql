-- Migration: Add Email Workflows with Position Support
-- Run this in your Supabase SQL Editor after applying 001_committee_positions.sql

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

CREATE INDEX IF NOT EXISTS idx_email_workflows_organization_id ON email_workflows(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_workflows_recipient_position_id ON email_workflows(recipient_position_id);

-- Add constraint to ensure proper recipient configuration
-- Either recipient_email must be set (for email type) or recipient_position_id must be set (for position type)
ALTER TABLE email_workflows ADD CONSTRAINT check_recipient_config
  CHECK (
    (recipient_type = 'email' AND recipient_email IS NOT NULL) OR
    (recipient_type = 'position' AND recipient_position_id IS NOT NULL) OR
    (recipient_type = 'all_members')
  );

COMMENT ON TABLE email_workflows IS 'Automated email workflows triggered by member actions';
COMMENT ON COLUMN email_workflows.recipient_type IS 'Type of recipient: email (specific email), position (committee position holder), or all_members';
COMMENT ON COLUMN email_workflows.recipient_position_id IS 'Committee position to send email to (e.g., Membership Secretary, Treasurer)';
COMMENT ON COLUMN email_workflows.trigger_event IS 'Event that triggers the workflow: signup, renewal, or both';

-- Migration complete!
