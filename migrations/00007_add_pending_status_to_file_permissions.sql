-- Add 'pending' status to file_permissions for access requests
ALTER TABLE file_permissions 
DROP CONSTRAINT IF EXISTS file_permissions_status_check;

ALTER TABLE file_permissions
ADD CONSTRAINT file_permissions_status_check 
CHECK (status IN ('active', 'revoked', 'expired', 'pending'));

