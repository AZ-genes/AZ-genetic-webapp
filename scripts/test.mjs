import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load test environment
dotenv.config({ path: resolve(__dirname, '../.env.test') });

// Verify environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'HEDERA_CONTRACT_ID'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

// Create test fixture directory if it doesn't exist
const fixturesDir = resolve(__dirname, '../tests/fixtures');
if (!existsSync(fixturesDir)) {
  mkdirSync(fixturesDir, { recursive: true });
}

// Ensure test VCF file exists
const testVcfPath = resolve(fixturesDir, 'test.vcf');
if (!existsSync(testVcfPath)) {
  const vcfContent = `##fileformat=VCF
##filedate=20251030
##source=TestData
##reference=GRCh38
##INFO=<ID=TEST,Number=1,Type=String,Description="Test genetic data">
#CHROM  POS     ID      REF     ALT     QUAL    FILTER  INFO
chr1    1000    test1   A       T       60      PASS    TEST=test_data
chr1    2000    test2   G       C       60      PASS    TEST=test_data`;
  writeFileSync(testVcfPath, vcfContent);
}

// Run tests
try {
  console.log('Running tests...');
  execSync('npx vitest run', { stdio: 'inherit' });
} catch (error) {
  console.error('Test execution failed:', error);
  process.exit(1);
}