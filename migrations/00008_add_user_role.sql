-- Create enum for user roles
DROP TYPE IF EXISTS user_role CASCADE;
CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'researcher');

-- Add user_role column to user_profiles table
ALTER TABLE user_profiles ADD COLUMN user_role user_role DEFAULT 'patient';

-- Update existing users to have patient role
UPDATE user_profiles SET user_role = 'patient' WHERE user_role IS NULL;

-- Make user_role NOT NULL after updating existing records
ALTER TABLE user_profiles ALTER COLUMN user_role SET NOT NULL;

-- Add index for user_role for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_role ON user_profiles(user_role);

