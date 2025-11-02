-- Create NFT certificates table for storing Hedera NFT information
CREATE TABLE IF NOT EXISTS nft_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID REFERENCES files(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    token_id TEXT NOT NULL, -- Hedera Token ID
    serial_number TEXT NOT NULL, -- NFT Serial Number
    hedera_transaction_id TEXT NOT NULL, -- Transaction ID from minting
    metadata JSONB, -- NFT metadata following HIP-412 standard
    ipfs_hash TEXT, -- IPFS hash pointing to off-chain metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(token_id, serial_number)
);

-- Add NFT certificate fields to files table
ALTER TABLE files 
ADD COLUMN IF NOT EXISTS nft_token_id TEXT,
ADD COLUMN IF NOT EXISTS nft_serial_number TEXT;

-- Create indexes for NFT certificates
CREATE INDEX IF NOT EXISTS idx_nft_certificates_file_id ON nft_certificates(file_id);
CREATE INDEX IF NOT EXISTS idx_nft_certificates_owner_id ON nft_certificates(owner_id);
CREATE INDEX IF NOT EXISTS idx_nft_certificates_token_id ON nft_certificates(token_id);
CREATE INDEX IF NOT EXISTS idx_files_nft_token_id ON files(nft_token_id);

-- Enable Row Level Security on NFT certificates
ALTER TABLE nft_certificates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for NFT certificates
CREATE POLICY "Users can read their own NFT certificates"
    ON nft_certificates FOR SELECT
    USING (owner_id IN (
        SELECT id FROM user_profiles WHERE auth_id = auth.uid()
    ));

CREATE POLICY "System can create NFT certificates"
    ON nft_certificates FOR INSERT
    WITH CHECK (true); -- Only server-side code should create NFTs

CREATE POLICY "System can update NFT certificates"
    ON nft_certificates FOR UPDATE
    USING (true); -- Only server-side code should update NFTs

-- Create update trigger for nft_certificates
DROP TRIGGER IF EXISTS update_nft_certificates_updated_at ON nft_certificates;
CREATE TRIGGER update_nft_certificates_updated_at
    BEFORE UPDATE ON nft_certificates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Add comment to table
COMMENT ON TABLE nft_certificates IS 'Stores information about Hedera NFT certificates minted for genetic data files';

