# Test Genetic Data

This directory contains randomly generated genetic data files for testing the AZ-Genes platform.

## Files

### genetic-data-test.vcf
**Variant Call Format** - Standard format for storing genetic variant data

- Contains 50 variants across all 22 chromosomes
- Includes disease-associated variants (Alzheimer, Huntington, BRCA)
- Includes pharmacogenetic variants (CYP2C19, CYP2D6, CYP2C9)
- Follows VCF 4.2 specification
- Valid format that can be uploaded to AZ-Genes

**Use Case**: Upload this file to test genetic data storage, encryption, and NFT certification

### genetic-data-test.csv
**Comma-Separated Values** - Simplified genetic report format

- Tabular format with variant information
- Includes disease associations and drug interactions
- Risk level classifications
- Easy to read and parse

**Use Case**: Testing CSV import and processing

### genetic-data-test.txt
**Text Report** - Human-readable genetic summary

- Formatted report with key findings
- Includes recommendations
- Summary statistics
- Professional medical report format

**Use Case**: Testing PDF/txt report processing

## Generating New Test Data

### Quick Generate (All Formats)
```bash
npm run generate:test-data all
```

### Individual Formats
```bash
npm run generate:test-data vcf   # VCF variant file
npm run generate:test-data csv   # CSV report
npm run generate:test-data txt   # TXT report
```

### Or Directly
```bash
node scripts/generateTestGeneticData.mjs all
```

## Data Characteristics

### Variants Included
- **Disease Risk**: APOE (Alzheimer), HTT (Huntington), BRCA1/BRCA2
- **Pharmacogenetic**: CYP2C19, CYP2D6, CYP2C9
- **Random SNPs**: Various common variants across chromosomes
- **Quality Scores**: Random values 50-100
- **Genotypes**: Random diploid genotypes (0|0, 0|1, 1|1)

### Privacy & Security
⚠️ **Important**: These files contain **synthetic data only**. They do not represent real genetic information. Safe for testing but should not be used for actual genetic analysis.

## Testing Scenarios

### 1. Basic Upload Test
- Upload VCF file through dashboard
- Verify file validation
- Check encryption process
- Confirm storage in Supabase

### 2. NFT Certification Test
- Upload VCF file
- Click "Get Certified" 
- Verify NFT minting
- Check certificate display

### 3. Data Sharing Test
- Upload data
- Grant access to another user
- Verify permissions
- Check audit logs

### 4. Download & Verification Test
- Upload and certify data
- Download file
- Verify integrity using Hedera hash
- Check decryption

### 5. Analytics Test (F3 Users)
- Upload genetic data
- View aggregated analytics
- Verify anonymization
- Check real-time updates

## File Sizes

- VCF: ~2.5 KB
- CSV: ~0.9 KB  
- TXT: ~0.8 KB

All files are small enough for quick testing but realistic enough to test processing logic.

## Validation

The VCF file can be validated using standard tools:

```bash
# Using bcftools (if installed)
bcftools view genetic-data-test.vcf

# Using Python (if pyvcf installed)
python -c "import vcf; vcf.Reader(open('genetic-data-test.vcf'))"
```

## Notes

- Variants are randomly selected from a curated pool
- Genotypes are randomly assigned for testing
- Quality scores are randomized within realistic ranges
- Allele frequencies are simulated
- All disease/drug associations are for demonstration only

## Next Steps

After generating test data:
1. Upload to AZ-Genes dashboard
2. Verify encryption and storage
3. Mint NFT certificate
4. Test sharing and permissions
5. Download and verify integrity
6. Review audit logs

## References

- [VCF Format Specification](https://samtools.github.io/hts-specs/VCFv4.2.pdf)
- [Hedera NFT Documentation](../docs/NFT_CERTIFICATES_SETUP.md)
- [AZ-Genes Setup Guide](../docs/IMPLEMENTATION_SUMMARY.md)

