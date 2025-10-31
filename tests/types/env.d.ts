declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      SKIP_AUTH_IN_TEST?: 'true' | 'false';
      MOCK_API_DELAY?: string; // milliseconds to delay mock responses
      HEDERA_CONTRACT_ID: string;
    }
  }
}