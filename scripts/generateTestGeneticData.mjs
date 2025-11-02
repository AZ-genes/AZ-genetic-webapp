#!/usr/bin/env node

/**
 * Generate random genetic data files for testing
 * Supports VCF (Variant Call Format) and CSV formats
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Genetic variants pool
const VARIANTS = [
  { chr: '1', pos: '1000', ref: 'A', alt: 'G', id: 'rs1234', qual: '99', filter: 'PASS' },
  { chr: '1', pos: '2000', ref: 'C', alt: 'T', id: 'rs5678', qual: '99', filter: 'PASS' },
  { chr: '2', pos: '1500', ref: 'G', alt: 'A', id: 'rs9012', qual: '99', filter: 'PASS' },
  { chr: '2', pos: '3500', ref: 'T', alt: 'C', id: 'rs3456', qual: '99', filter: 'PASS' },
  { chr: '3', pos: '5000', ref: 'A', alt: 'T', id: 'rs7890', qual: '99', filter: 'PASS' },
  { chr: '4', pos: '2000', ref: 'G', alt: 'C', id: 'rs2468', qual: '99', filter: 'PASS' },
  { chr: '5', pos: '1800', ref: 'C', alt: 'A', id: 'rs1357', qual: '99', filter: 'PASS' },
  { chr: '6', pos: '7200', ref: 'T', alt: 'G', id: 'rs9753', qual: '99', filter: 'PASS' },
  { chr: '7', pos: '1100', ref: 'A', alt: 'G', id: 'rs8642', qual: '99', filter: 'PASS' },
  { chr: '8', pos: '4400', ref: 'C', alt: 'T', id: 'rs1593', qual: '99', filter: 'PASS' },
  { chr: '9', pos: '3100', ref: 'G', alt: 'A', id: 'rs7410', qual: '99', filter: 'PASS' },
  { chr: '10', pos: '6200', ref: 'T', alt: 'C', id: 'rs2580', qual: '99', filter: 'PASS' },
  { chr: '11', pos: '2500', ref: 'A', alt: 'C', id: 'rs9631', qual: '99', filter: 'PASS' },
  { chr: '12', pos: '8900', ref: 'G', alt: 'T', id: 'rs1470', qual: '99', filter: 'PASS' },
  { chr: '13', pos: '3700', ref: 'C', alt: 'A', id: 'rs8520', qual: '99', filter: 'PASS' },
  { chr: '14', pos: '5600', ref: 'T', alt: 'G', id: 'rs6301', qual: '99', filter: 'PASS' },
  { chr: '15', pos: '2100', ref: 'A', alt: 'T', id: 'rs4785', qual: '99', filter: 'PASS' },
  { chr: '16', pos: '7800', ref: 'G', alt: 'A', id: 'rs3694', qual: '99', filter: 'PASS' },
  { chr: '17', pos: '4100', ref: 'C', alt: 'T', id: 'rs7147', qual: '99', filter: 'PASS' },
  { chr: '18', pos: '5200', ref: 'T', alt: 'C', id: 'rs2063', qual: '99', filter: 'PASS' },
  { chr: '19', pos: '2900', ref: 'A', alt: 'G', id: 'rs5489', qual: '99', filter: 'PASS' },
  { chr: '20', pos: '6600', ref: 'G', alt: 'T', id: 'rs1824', qual: '99', filter: 'PASS' },
  { chr: '21', pos: '3400', ref: 'C', alt: 'A', id: 'rs9367', qual: '99', filter: 'PASS' },
  { chr: '22', pos: '4800', ref: 'T', alt: 'G', id: 'rs7093', qual: '99', filter: 'PASS' },
];

// Disease-associated variants
const DISEASE_VARIANTS = [
  { chr: '1', pos: '110922000', ref: 'G', alt: 'A', id: 'rs7412', disease: 'Alzheimer Risk', gene: 'APOE' },
  { chr: '4', pos: '3074875', ref: 'C', alt: 'A', disease: 'Huntington Disease', gene: 'HTT' },
  { chr: '17', pos: '43044295', ref: 'G', alt: 'A', disease: 'Breast Cancer Risk', gene: 'BRCA1' },
  { chr: '13', pos: '32316461', ref: 'T', alt: 'C', disease: 'Breast Cancer Risk', gene: 'BRCA2' },
];

// Pharmacogenetic variants
const PHARMACOGENETIC_VARIANTS = [
  { chr: '10', pos: '96541615', ref: 'A', alt: 'G', gene: 'CYP2C19', drug: 'Clopidogrel', effect: 'Poor Metabolizer' },
  { chr: '22', pos: '42128992', ref: 'G', alt: 'A', gene: 'CYP2D6', drug: 'Codeine', effect: 'Ultrarapid Metabolizer' },
  { chr: '7', pos: '87160645', ref: 'T', alt: 'C', gene: 'CYP2C9', drug: 'Warfarin', effect: 'Intermediate Metabolizer' },
];

// Helper function to generate random genotype (0/0, 0/1, 1/1)
function randomGenotype() {
  const genotypes = ['0|0', '0|1', '1|0', '1|1'];
  return genotypes[Math.floor(Math.random() * genotypes.length)];
}

// Helper function to generate random quality score
function randomQuality() {
  return Math.floor(Math.random() * 50) + 50; // 50-100
}

// Generate VCF file
function generateVCF(numVariants = 50, includeDisease = true, includePharma = true) {
  const lines = [];
  
  // VCF Header
  lines.push('##fileformat=VCFv4.2');
  lines.push('##fileDate=' + new Date().toISOString().split('T')[0]);
  lines.push('##source=AZ-Genes Test Data Generator');
  lines.push('##reference=GRCh38.p13');
  lines.push('##contig=<ID=1,length=248956422>');
  lines.push('##contig=<ID=2,length=242193529>');
  lines.push('##contig=<ID=3,length=198295559>');
  lines.push('##contig=<ID=4,length=190214555>');
  lines.push('##INFO=<ID=NS,Number=1,Type=Integer,Description="Number of Samples With Data">');
  lines.push('##INFO=<ID=DP,Number=1,Type=Integer,Description="Total Depth">');
  lines.push('##INFO=<ID=AF,Number=A,Type=Float,Description="Allele Frequency">');
  lines.push('##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">');
  lines.push('##FORMAT=<ID=DP,Number=1,Type=Integer,Description="Read Depth">');
  lines.push('##FORMAT=<ID=GQ,Number=1,Type=Integer,Description="Genotype Quality">');
  lines.push('#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSAMPLE');
  
  let variantsAdded = 0;
  
  // Add disease variants if requested
  if (includeDisease) {
    const numDisease = Math.min(2, DISEASE_VARIANTS.length);
    for (let i = 0; i < numDisease; i++) {
      const variant = DISEASE_VARIANTS[i];
      const info = `NS=1;DP=${randomQuality() + 50};AF=0.5`;
      const format = `GT:DP:GQ`;
      const genotype = randomGenotype();
      const dp = Math.floor(Math.random() * 50) + 50;
      const gq = randomQuality();
      lines.push(`${variant.chr}\t${variant.pos}\t${variant.id || '.'}\t${variant.ref}\t${variant.alt}\t99\tPASS\t${info}\t${format}\t${genotype}:${dp}:${gq}`);
      variantsAdded++;
    }
  }
  
  // Add pharmacogenetic variants if requested
  if (includePharma) {
    const numPharma = Math.min(2, PHARMACOGENETIC_VARIANTS.length);
    for (let i = 0; i < numPharma; i++) {
      const variant = PHARMACOGENETIC_VARIANTS[i];
      const info = `NS=1;DP=${randomQuality() + 50};AF=0.5`;
      const format = `GT:DP:GQ`;
      const genotype = randomGenotype();
      const dp = Math.floor(Math.random() * 50) + 50;
      const gq = randomQuality();
      lines.push(`${variant.chr}\t${variant.pos}\t${variant.id || '.'}\t${variant.ref}\t${variant.alt}\t99\tPASS\t${info}\t${format}\t${genotype}:${dp}:${gq}`);
      variantsAdded++;
    }
  }
  
  // Add random variants
  const remainingVariants = numVariants - variantsAdded;
  const randomVarPool = [...VARIANTS];
  
  for (let i = 0; i < remainingVariants && randomVarPool.length > 0; i++) {
    const index = Math.floor(Math.random() * randomVarPool.length);
    const variant = randomVarPool.splice(index, 1)[0];
    const info = `NS=1;DP=${randomQuality() + 50};AF=${(Math.random()).toFixed(3)}`;
    const format = `GT:DP:GQ`;
    const genotype = randomGenotype();
    const dp = Math.floor(Math.random() * 50) + 50;
    const gq = randomQuality();
    lines.push(`${variant.chr}\t${variant.pos}\t${variant.id}\t${variant.ref}\t${variant.alt}\t${variant.qual}\t${variant.filter}\t${info}\t${format}\t${genotype}:${dp}:${gq}`);
    variantsAdded++;
  }
  
  return lines.join('\n');
}

// Generate CSV file (simplified genetic report)
function generateCSV(numVariants = 50) {
  const lines = [];
  const variantsToInclude = [...VARIANTS, ...DISEASE_VARIANTS, ...PHARMACOGENETIC_VARIANTS];
  
  lines.push('CHROMOSOME,POSITION,REFERENCE,ALTERNATE,GENE,DISEASE ASSOCIATION,DRUG INTERACTION,RISK LEVEL');
  
  for (let i = 0; i < Math.min(numVariants, variantsToInclude.length); i++) {
    const variant = variantsToInclude[i];
    const riskLevel = ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)];
    const disease = variant.disease || '';
    const drug = variant.drug ? `${variant.drug} (${variant.effect})` : '';
    
    lines.push(`${variant.chr},${variant.pos},${variant.ref},${variant.alt},${variant.gene || ''},${disease},${drug},${riskLevel}`);
  }
  
  return lines.join('\n');
}

// Generate TXT file (genetic report)
function generateTXT() {
  const lines = [];
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  lines.push('AZ-GENES GENETIC TESTING REPORT');
  lines.push('=================================');
  lines.push('');
  lines.push(`Report Date: ${today}`);
  lines.push(`Sample ID: TEST-${Math.floor(Math.random() * 10000)}`);
  lines.push('');
  lines.push('SUMMARY');
  lines.push('-------');
  lines.push('Total Variants Analyzed: 50');
  lines.push('Disease Risk Variants: 4');
  lines.push('Pharmacogenetic Variants: 3');
  lines.push('Benign Variants: 43');
  lines.push('');
  lines.push('KEY FINDINGS');
  lines.push('------------');
  lines.push('• APOE ε4 allele detected - Increased risk for late-onset Alzheimer disease');
  lines.push('• CYP2C19 *2/*2 genotype - Poor metabolizer of clopidogrel');
  lines.push('• No pathogenic BRCA1/BRCA2 variants detected');
  lines.push('');
  lines.push('RECOMMENDATIONS');
  lines.push('---------------');
  lines.push('1. Consider alternative antiplatelet therapy to clopidogrel');
  lines.push('2. Implement cardiovascular risk reduction strategies');
  lines.push('3. Annual cognitive screening recommended');
  lines.push('4. Follow standard age-appropriate cancer screening guidelines');
  lines.push('');
  lines.push('For questions, please contact your healthcare provider.');
  lines.push('This report is for informational purposes only and does not constitute medical advice.');
  
  return lines.join('\n');
}

// Main function
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const outputDir = path.join(__dirname, '../test-data');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  switch (command) {
    case 'vcf':
      const vcfContent = generateVCF(50, true, true);
      const vcfPath = path.join(outputDir, 'genetic-data-test.vcf');
      fs.writeFileSync(vcfPath, vcfContent);
      console.log('✅ Generated VCF file:', vcfPath);
      console.log(`   Size: ${fs.statSync(vcfPath).size} bytes`);
      break;
      
    case 'csv':
      const csvContent = generateCSV(50);
      const csvPath = path.join(outputDir, 'genetic-data-test.csv');
      fs.writeFileSync(csvPath, csvContent);
      console.log('✅ Generated CSV file:', csvPath);
      console.log(`   Size: ${fs.statSync(csvPath).size} bytes`);
      break;
      
    case 'txt':
      const txtContent = generateTXT();
      const txtPath = path.join(outputDir, 'genetic-data-test.txt');
      fs.writeFileSync(txtPath, txtContent);
      console.log('✅ Generated TXT file:', txtPath);
      console.log(`   Size: ${fs.statSync(txtPath).size} bytes`);
      break;
      
    case 'all':
      // Generate all formats
      const vcfAll = generateVCF(50, true, true);
      const csvAll = generateCSV(50);
      const txtAll = generateTXT();
      
      fs.writeFileSync(path.join(outputDir, 'genetic-data-test.vcf'), vcfAll);
      fs.writeFileSync(path.join(outputDir, 'genetic-data-test.csv'), csvAll);
      fs.writeFileSync(path.join(outputDir, 'genetic-data-test.txt'), txtAll);
      
      console.log('✅ Generated all formats:');
      console.log('   - genetic-data-test.vcf (VCF variant data)');
      console.log('   - genetic-data-test.csv (CSV genetic report)');
      console.log('   - genetic-data-test.txt (TXT summary report)');
      break;
      
    default:
      console.log('Usage: node generateTestGeneticData.mjs [format]');
      console.log('');
      console.log('Formats:');
      console.log('  vcf   - Generate VCF variant file (50 variants)');
      console.log('  csv   - Generate CSV genetic report');
      console.log('  txt   - Generate TXT summary report');
      console.log('  all   - Generate all formats');
      console.log('');
      console.log('Examples:');
      console.log('  node generateTestGeneticData.mjs vcf');
      console.log('  node generateTestGeneticData.mjs all');
      break;
  }
}

main();

