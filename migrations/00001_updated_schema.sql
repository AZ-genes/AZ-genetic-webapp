-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for subscription tiers
DROP TYPE IF EXISTS subscription_tier CASCADE;
CREATE TYPE subscription_tier AS ENUM ('F1', 'F2', 'F3');

-- Create users table to extend Supabase Auth
DROP TABLE IF EXISTS user_profiles CASCADE;
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID UNIQUE NOT NULL,
    subscription_tier subscription_tier NOT NULL DEFAULT 'F1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create files table for storing encrypted genetic data
DROP TABLE IF EXISTS files CASCADE;
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    encryption_key TEXT NOT NULL,
    encryption_iv TEXT NOT NULL,
    hash TEXT NOT NULL,
    hedera_transaction_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create permissions table for access control
DROP TABLE IF EXISTS file_permissions CASCADE;
CREATE TABLE file_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID REFERENCES files(id) ON DELETE CASCADE,
    grantee_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    hedera_transaction_id TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    access_level TEXT NOT NULL CHECK (access_level IN ('read', 'read_write')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(file_id, grantee_id, status)
);

-- Create access logs table
DROP TABLE IF EXISTS file_access_logs CASCADE;
CREATE TABLE file_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID REFERENCES files(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    access_type TEXT NOT NULL,
    status TEXT NOT NULL,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create analytics events table for F3 users
DROP TABLE IF EXISTS analytics_events CASCADE;
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    file_type TEXT NOT NULL,
    region TEXT NOT NULL,
    age_range TEXT NOT NULL,
    genetic_markers TEXT[] NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create update triggers
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_files_updated_at ON files;
CREATE TRIGGER update_files_updated_at
    BEFORE UPDATE ON files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_file_permissions_updated_at ON file_permissions;
CREATE TRIGGER update_file_permissions_updated_at
    BEFORE UPDATE ON file_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_id ON user_profiles(auth_id);
CREATE INDEX IF NOT EXISTS idx_files_owner_id ON files(owner_id);
CREATE INDEX IF NOT EXISTS idx_file_permissions_file_id ON file_permissions(file_id);
CREATE INDEX IF NOT EXISTS idx_file_permissions_grantee_id ON file_permissions(grantee_id);
CREATE INDEX IF NOT EXISTS idx_file_access_logs_file_id ON file_access_logs(file_id);
CREATE INDEX IF NOT EXISTS idx_file_access_logs_user_id ON file_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
CREATE POLICY "Users can read their own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = auth_id);

CREATE POLICY "Users can update their own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = auth_id);

-- Create policies for files
CREATE POLICY "Users can read their own files"
    ON files FOR SELECT
    USING (owner_id IN (
        SELECT id FROM user_profiles WHERE auth_id = auth.uid()
    ));

CREATE POLICY "Users can read shared files"
    ON files FOR SELECT
    USING (id IN (
        SELECT file_id FROM file_permissions
        WHERE grantee_id IN (
            SELECT id FROM user_profiles WHERE auth_id = auth.uid()
        )
        AND status = 'active'
        AND expires_at > NOW()
    ));

-- Create policies for file_permissions
CREATE POLICY "F1 users can grant access"
    ON file_permissions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles up
            JOIN files f ON f.owner_id = up.id
            WHERE up.auth_id = auth.uid()
            AND up.subscription_tier = 'F1'
            AND f.id = file_id
        )
    );

CREATE POLICY "Users can view permissions for their files"
    ON file_permissions FOR SELECT
    USING (
        file_id IN (
            SELECT id FROM files WHERE owner_id IN (
                SELECT id FROM user_profiles WHERE auth_id = auth.uid()
            )
        )
        OR
        grantee_id IN (
            SELECT id FROM user_profiles WHERE auth_id = auth.uid()
        )
    );

-- Create policies for analytics
CREATE POLICY "F3 users can read analytics"
    ON analytics_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE auth_id = auth.uid()
            AND subscription_tier = 'F3'
        )
    );