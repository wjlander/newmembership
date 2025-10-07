-- Fix email_templates constraint to allow all template types used by the app
-- This adds 'expiry' and 'newsletter' to the allowed template_type values

-- Drop the old constraint
ALTER TABLE email_templates DROP CONSTRAINT IF EXISTS email_templates_template_type_check;

-- Add the updated constraint with all required types
ALTER TABLE email_templates ADD CONSTRAINT email_templates_template_type_check 
  CHECK (template_type IN ('welcome', 'renewal', 'expiry', 'event', 'newsletter', 'custom'));

-- Also ensure all required columns exist
DO $$ 
BEGIN
  -- Add body column if it doesn't exist (used by the app)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_templates' AND column_name = 'body'
  ) THEN
    ALTER TABLE email_templates ADD COLUMN body TEXT;
  END IF;

  -- Add description column if it doesn't exist (used by the app)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_templates' AND column_name = 'description'
  ) THEN
    ALTER TABLE email_templates ADD COLUMN description TEXT;
  END IF;

  -- Add is_default column if it doesn't exist (used by the app)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_templates' AND column_name = 'is_default'
  ) THEN
    ALTER TABLE email_templates ADD COLUMN is_default BOOLEAN DEFAULT false;
  END IF;

  -- Add created_by column if it doesn't exist (used by the app)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_templates' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE email_templates ADD COLUMN created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Comment for clarity
COMMENT ON CONSTRAINT email_templates_template_type_check ON email_templates IS 
  'Allows template types: welcome, renewal, expiry, event, newsletter, custom';
