import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('API Configuration', () => {
  it('should have valid Supabase configuration', () => {
    expect(process.env.SUPABASE_URL).toBeDefined();
    expect(process.env.SUPABASE_ANON_KEY).toBeDefined();
    
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    
    expect(supabase).toBeDefined();
  });

  it('should have valid Hedera configuration', () => {
    expect(process.env.HEDERA_CONTRACT_ID).toBeDefined();
    expect(process.env.HEDERA_CONTRACT_ID).toMatch(/^0\.0\.\d+$/);
  });
});