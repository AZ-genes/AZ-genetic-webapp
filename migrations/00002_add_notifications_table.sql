-- Create notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own notifications
CREATE POLICY "Users can read their own notifications"
    ON notifications FOR SELECT
    USING (user_id IN (
        SELECT id FROM user_profiles WHERE auth_id = auth.uid()
    ));
