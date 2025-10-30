-- Create enum for subscription tiers
CREATE TYPE subscription_tier AS ENUM ('F1', 'F2', 'F3');

-- Create users table to extend Supabase Auth
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_tier subscription_tier NOT NULL DEFAULT 'F1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create files table for storing encrypted genetic data
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create permissions table for access control
CREATE TABLE file_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID REFERENCES files(id) ON DELETE CASCADE,
    grantee_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    hedera_transaction_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(file_id, grantee_id)
);

-- Create analytics events table for F3 users
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    file_type TEXT NOT NULL,
    anonymized_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create RLS policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- User profiles access policy
CREATE POLICY "Users can read their own profile"
    ON user_profiles
    FOR SELECT
    USING (auth.uid() = auth_id);

CREATE POLICY "Users can update their own profile"
    ON user_profiles
    FOR UPDATE
    USING (auth.uid() = auth_id);

-- Files access policies
CREATE POLICY "Users can read own files"
    ON files
    FOR SELECT
    USING (
        owner_id IN (
            SELECT id FROM user_profiles WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "Users can read shared files"
    ON files
    FOR SELECT
    USING (
        id IN (
            SELECT file_id FROM file_permissions
            WHERE grantee_id IN (
                SELECT id FROM user_profiles WHERE auth_id = auth.uid()
            )
        )
    );

-- File permissions policies
CREATE POLICY "F1 users can grant access to their files"
    ON file_permissions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles up
            JOIN files f ON f.owner_id = up.id
            WHERE up.auth_id = auth.uid()
            AND up.subscription_tier = 'F1'
            AND f.id = file_id
        )
    );

-- Analytics access policy (F3 only)
CREATE POLICY "F3 users can read analytics"
    ON analytics_events
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE auth_id = auth.uid()
            AND subscription_tier = 'F3'
        )
    );