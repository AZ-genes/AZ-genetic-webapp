import { beforeAll } from 'vitest';
import * as dotenv from 'dotenv';
import path from 'path';

beforeAll(() => {
  // Load environment variables from .env.test file
  dotenv.config({
    path: path.resolve(__dirname, '../.env.test')
  });

  // Verify required environment variables
  const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'HEDERA_CONTRACT_ID'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
});