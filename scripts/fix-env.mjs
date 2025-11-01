import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '../.env.local');

console.log('Reading .env.local...');
const envContent = fs.readFileSync(envPath, 'utf8');

// Fix issues
let fixed = envContent;
let changes = [];

// Fix 1: Remove 0x prefix from HEDERA_OPERATOR_KEY
if (fixed.includes('HEDERA_OPERATOR_KEY=0x')) {
  fixed = fixed.replace('HEDERA_OPERATOR_KEY=0x', 'HEDERA_OPERATOR_KEY=');
  changes.push('Removed 0x prefix from HEDERA_OPERATOR_KEY');
}

// Fix 2: Fix HEDERA_TOPIC_ID format (0.07179350 -> 0.0.7179350)
if (fixed.includes('HEDERA_TOPIC_ID=0.07179350')) {
  fixed = fixed.replace('HEDERA_TOPIC_ID=0.07179350', 'HEDERA_TOPIC_ID=0.0.7179350');
  changes.push('Fixed HEDERA_TOPIC_ID format');
}

// Fix 3: Remove comment from HEDERA_TOPIC_ID
fixed = fixed.replace('HEDERA_TOPIC_ID=.*#.*\n', (match) => {
  const id = match.split('#')[0].trim();
  return id + '\n';
});

if (changes.length > 0) {
  fs.writeFileSync(envPath, fixed);
  console.log('✅ Fixed .env.local:');
  changes.forEach(c => console.log('  -', c));
} else {
  console.log('✅ No issues found in .env.local');
}

