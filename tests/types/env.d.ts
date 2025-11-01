declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      SKIP_AUTH_IN_TEST?: 'true' | 'false';
      SKIP_SUPABASE_INTEGRATION?: 'true' | 'false';
      MOCK_API_DELAY?: string; // milliseconds to delay mock responses
      SUPABASE_URL: string;
      SUPABASE_ANON_KEY: string;
      HEDERA_CONTRACT_ID: string;
    }
  }
}