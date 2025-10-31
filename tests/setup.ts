import { beforeAll } from 'vitest';
import * as dotenv from 'dotenv';
import path from 'path';

beforeAll(() => {
  // Load environment variables from .env.test file
  dotenv.config({
    path: path.resolve(__dirname, '../.env.test')
  });

  // Set SKIP_AUTH_IN_TEST to true for offline testing
  process.env.SKIP_AUTH_IN_TEST = 'true';

  // Verify required environment variables
  const required = ['HEDERA_CONTRACT_ID'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
});