-- Create mailing lists table
CREATE TABLE IF NOT EXISTS mailing_lists (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    description text,
    slug text NOT NULL,
    is_active boolean DEFAULT true,
    subscriber_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(organization_id, slug)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_mailing_lists_organization_id ON mailing_lists(organization_id);
CREATE INDEX IF NOT EXISTS idx_mailing_lists_slug ON mailing_lists(slug);

-- Create junction table for subscribers and mailing lists
CREATE TABLE IF NOT EXISTS subscriber_lists (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subscriber_id uuid REFERENCES email_subscribers(id) ON DELETE CASCADE NOT NULL,
    list_id uuid REFERENCES mailing_lists(id) ON DELETE CASCADE NOT NULL,
    status text DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed', 'pending')),
    subscribed_at timestamptz DEFAULT now(),
    unsubscribed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(subscriber_id, list_id)
);

-- Create indexes for junction table
CREATE INDEX IF NOT EXISTS idx_subscriber_lists_subscriber_id ON subscriber_lists(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_subscriber_lists_list_id ON subscriber_lists(list_id);
CREATE INDEX IF NOT EXISTS idx_subscriber_lists_status ON subscriber_lists(status);

-- Add mailing_list_id to email_campaigns table
ALTER TABLE email_campaigns 
ADD COLUMN IF NOT EXISTS mailing_list_id uuid REFERENCES mailing_lists(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_email_campaigns_mailing_list_id ON email_campaigns(mailing_list_id);

-- Enable RLS on new tables
ALTER TABLE mailing_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriber_lists ENABLE ROW LEVEL SECURITY;

-- RLS policies for mailing_lists
CREATE POLICY "Users can view mailing lists in their organization"
    ON mailing_lists FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'super_admin'
        )
    );

CREATE POLICY "Admins can insert mailing lists in their organization"
    ON mailing_lists FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE user_id = auth.uid() 
            AND (role = 'admin' OR role = 'super_admin')
        )
    );

CREATE POLICY "Admins can update mailing lists in their organization"
    ON mailing_lists FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE user_id = auth.uid() 
            AND (role = 'admin' OR role = 'super_admin')
        )
    );

CREATE POLICY "Admins can delete mailing lists in their organization"
    ON mailing_lists FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE user_id = auth.uid() 
            AND (role = 'admin' OR role = 'super_admin')
        )
    );

-- RLS policies for subscriber_lists
CREATE POLICY "Users can view subscriber list associations in their organization"
    ON subscriber_lists FOR SELECT
    USING (
        list_id IN (
            SELECT id FROM mailing_lists WHERE organization_id IN (
                SELECT organization_id FROM profiles WHERE user_id = auth.uid()
            )
        )
        OR EXISTS (
            SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'super_admin'
        )
    );

CREATE POLICY "Admins can manage subscriber list associations"
    ON subscriber_lists FOR ALL
    USING (
        list_id IN (
            SELECT id FROM mailing_lists WHERE organization_id IN (
                SELECT organization_id FROM profiles 
                WHERE user_id = auth.uid() 
                AND (role = 'admin' OR role = 'super_admin')
            )
        )
    );

-- Function to update subscriber count on mailing lists
CREATE OR REPLACE FUNCTION update_mailing_list_subscriber_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE mailing_lists 
        SET subscriber_count = subscriber_count + 1
        WHERE id = NEW.list_id AND NEW.status = 'subscribed';
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE mailing_lists 
        SET subscriber_count = subscriber_count - 1
        WHERE id = OLD.list_id AND OLD.status = 'subscribed' AND subscriber_count > 0;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status = 'subscribed' AND NEW.status != 'subscribed' THEN
            UPDATE mailing_lists 
            SET subscriber_count = subscriber_count - 1
            WHERE id = OLD.list_id AND subscriber_count > 0;
        ELSIF OLD.status != 'subscribed' AND NEW.status = 'subscribed' THEN
            UPDATE mailing_lists 
            SET subscriber_count = subscriber_count + 1
            WHERE id = NEW.list_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update subscriber count
DROP TRIGGER IF EXISTS trigger_update_subscriber_count ON subscriber_lists;
CREATE TRIGGER trigger_update_subscriber_count
    AFTER INSERT OR UPDATE OR DELETE ON subscriber_lists
    FOR EACH ROW
    EXECUTE FUNCTION update_mailing_list_subscriber_count();

-- Update updated_at timestamp trigger for mailing_lists
CREATE OR REPLACE FUNCTION update_mailing_list_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_mailing_list_timestamp ON mailing_lists;
CREATE TRIGGER trigger_update_mailing_list_timestamp
    BEFORE UPDATE ON mailing_lists
    FOR EACH ROW
    EXECUTE FUNCTION update_mailing_list_updated_at();
