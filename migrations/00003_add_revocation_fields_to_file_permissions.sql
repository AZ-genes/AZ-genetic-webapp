-- Add revocation-related fields to file_permissions table
ALTER TABLE file_permissions
ADD COLUMN revoked_at TIMESTAMPTZ,
ADD COLUMN revoked_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
ADD COLUMN revocation_reason TEXT,
ADD COLUMN revocation_transaction_id TEXT;
