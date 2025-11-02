#!/usr/bin/env node

/**
 * Complete setup and mint flow for NFT certificates
 * This script guides you through the entire process
 */

import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n🎬 AZ-Genes NFT Certificate Setup & Mint\n');
console.log('================================================\n');

// Check if .env.local exists
const envPath = resolve(__dirname, '../.env.local');
const hasEnv = existsSync(envPath);

if (!hasEnv) {
  console.log('⚠️  .env.local file not found!');
  console.log('\n📝 Please create a .env.local file with the following variables:');
  console.log('\n   HEDERA_OPERATOR_ID=0.0.XXXXXXXX');
  console.log('   HEDERA_OPERATOR_KEY=YOUR_PRIVATE_KEY');
  console.log('   HEDERA_NETWORK=testnet');
  console.log('   HEDERA_TOPIC_ID=0.0.XXXXXXXX (optional for now)');
  console.log('   HEDERA_NFT_COLLECTION_TOKEN_ID= (will be created)');
  console.log('\n📚 See HEDERA_SETUP.md for detailed instructions');
  console.log('\n🔗 Get credentials from: https://portal.hedera.com\n');
  process.exit(1);
}

// Load environment
dotenv.config({ path: envPath });

console.log('📋 Current Configuration:');
console.log('   Network:', process.env.HEDERA_NETWORK || 'testnet');
console.log('   Operator ID:', process.env.HEDERA_OPERATOR_ID ? '✅ Set' : '❌ Missing');
console.log('   Operator Key:', process.env.HEDERA_OPERATOR_KEY ? '✅ Set' : '❌ Missing');
console.log('   Topic ID:', process.env.HEDERA_TOPIC_ID || 'Not set');
console.log('   NFT Collection:', process.env.HEDERA_NFT_COLLECTION_TOKEN_ID || 'Not set\n');

// Check for required credentials
if (!process.env.HEDERA_OPERATOR_ID || !process.env.HEDERA_OPERATOR_KEY) {
  console.log('❌ Missing required credentials!');
  console.log('Please set HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY in .env.local\n');
  process.exit(1);
}

// Step 1: Generate test data
console.log('📂 Step 1: Generating test genetic data...');
try {
  execSync('npm run generate:test-data vcf', { stdio: 'inherit', cwd: resolve(__dirname, '..') });
  console.log('✅ Test data generated\n');
} catch (error) {
  console.log('❌ Failed to generate test data\n');
  process.exit(1);
}

// Step 2: Create NFT collection if needed
if (!process.env.HEDERA_NFT_COLLECTION_TOKEN_ID) {
  console.log('🎫 Step 2: Creating NFT collection...');
  try {
    execSync('npm run create-nft-collection', { stdio: 'inherit', cwd: resolve(__dirname, '..') });
    console.log('\n✅ NFT collection created');
    console.log('⚠️  IMPORTANT: Add the token ID to your .env.local file as HEDERA_NFT_COLLECTION_TOKEN_ID\n');
  } catch (error) {
    console.log('❌ Failed to create NFT collection\n');
    process.exit(1);
  }
} else {
  console.log('✅ NFT collection already configured');
}

// Step 3: Mint NFT certificate
if (process.env.HEDERA_NFT_COLLECTION_TOKEN_ID) {
  console.log('\n💰 Step 3: Minting NFT certificate...');
  try {
    execSync('npm run mint-test-nft', { stdio: 'inherit', cwd: resolve(__dirname, '..') });
    console.log('\n✅ NFT certificate minted successfully!');
  } catch (error) {
    console.log('\n❌ Failed to mint NFT certificate\n');
    process.exit(1);
  }
} else {
  console.log('\n⚠️  Skipping mint - NFT collection not configured');
  console.log('Run this script again after adding HEDERA_NFT_COLLECTION_TOKEN_ID to .env.local\n');
}

console.log('\n🎉 Setup complete!');
console.log('\n📊 Next steps:');
console.log('   1. Start the dev server: npm run dev');
console.log('   2. Open http://localhost:3000');
console.log('   3. Sign up or log in');
console.log('   4. Upload your genetic data');
console.log('   5. Click "Get Certified" to mint NFT certificates');
console.log('\n');

