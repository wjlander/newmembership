-- Fix email_workflows recipient_email constraint
-- The recipient_email should be nullable because position-based workflows don't need it

-- First, remove NOT NULL constraint if it exists
ALTER TABLE email_workflows ALTER COLUMN recipient_email DROP NOT NULL;

-- Ensure the check constraint exists and is correct
DO $$ 
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_recipient_config'
  ) THEN
    ALTER TABLE email_workflows DROP CONSTRAINT check_recipient_config;
  END IF;
  
  -- Add the constraint with proper logic
  ALTER TABLE email_workflows ADD CONSTRAINT check_recipient_config
    CHECK (
      (recipient_type = 'email' AND recipient_email IS NOT NULL) OR
      (recipient_type = 'position' AND recipient_position_id IS NOT NULL) OR
      (recipient_type = 'all_members')
    );
END $$;

COMMENT ON CONSTRAINT check_recipient_config ON email_workflows IS 'Ensures proper recipient configuration based on type';
