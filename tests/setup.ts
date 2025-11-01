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

  // HEDERA_CONTRACT_ID is optional for tests (will use mock mode)
  // Only require it if you're testing actual contract interactions
  if (process.env.HEDERA_CONTRACT_ID) {
    console.log('Using Hedera contract:', process.env.HEDERA_CONTRACT_ID);
  } else {
    console.log('Running tests in mock mode (no Hedera contract configured)');
  }
});