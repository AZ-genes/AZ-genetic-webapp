-- Create token_transactions table for logging Hedera token transfers
CREATE TABLE IF NOT EXISTS token_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    recipient_id TEXT NOT NULL,
    amount NUMERIC(18, 8) NOT NULL,
    transaction_id TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_token_transactions_sender_id ON token_transactions(sender_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_recipient_id ON token_transactions(recipient_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_timestamp ON token_transactions(timestamp DESC);

