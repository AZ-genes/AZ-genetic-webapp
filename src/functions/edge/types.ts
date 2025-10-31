export interface UserProfile {
  id: string;
  auth_id: string;
  subscription_tier: 'F1' | 'F2' | 'F3';
  created_at: string;
  updated_at: string;
}

export interface FileMetadata {
  id: string;
  owner_id: string;
  file_name: string;
  file_type: string;
  storage_path: string;
  encryption_key: string;
  encryption_iv: string;
  hedera_transaction_id: string;
  hash: string;
  created_at: string;
}

export interface FilePermission {
  id: string;
  file_id: string;
  grantee_id: string;
  granted_by: string;
  hedera_transaction_id: string;
  created_at: string;
}