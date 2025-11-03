-- Add name and email columns to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_name ON user_profiles(name);

