import * as forge from 'node-forge';

export interface GeneticVariant {
  chromosome: string;
  position: number;
  reference: string;
  alternate: string;
  quality: number;
  filter: string;
  info: Record<string, any>;
}

export interface ProcessedGeneticData {
  variants: GeneticVariant[];
  totalVariants: number;
  chromosomes: string[];
  qualityStats: {
    min: number;
    max: number;
    average: number;
  };
  metadata: {
    fileFormat: string;
    source: string;
    referenceGenome: string;
    processedAt: string;
  };
}

export class GeneticETLService {
  /**
   * Processes VCF file content and extracts genetic variants
   */
  async processVCFFile(vcfContent: string): Promise<ProcessedGeneticData> {
    const lines = vcfContent.split('\n');
    const variants: GeneticVariant[] = [];
    const metadata: Record<string, string> = {};
    let headerLineIndex = -1;

    // Parse metadata lines (lines starting with ##)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('##fileformat=')) {
        metadata.fileFormat = line.split('=')[1];
      } else if (line.startsWith('##source=')) {
        metadata.source = line.split('=').slice(1).join('=');
      } else if (line.startsWith('##reference=')) {
        metadata.referenceGenome = line.split('=').slice(1).join('=');
      } else if (line.startsWith('#CHROM')) {
        headerLineIndex = i;
        break;
      }
    }

    if (headerLineIndex === -1) {
      throw new Error('Invalid VCF format: Missing header line');
    }

    // Parse variant lines
    for (let i = headerLineIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split('\t');
      if (parts.length < 8) {
        continue; // Skip malformed lines
      }

      const variant: GeneticVariant = {
        chromosome: parts[0],
        position: parseInt(parts[1], 10),
        reference: parts[3],
        alternate: parts[4],
        quality: parts[5] === '.' ? 0 : parseFloat(parts[5]),
        filter: parts[6],
        info: this.parseInfoField(parts[7])
      };

      variants.push(variant);
    }

    // Calculate quality statistics
    const qualities = variants.map(v => v.quality).filter(q => !isNaN(q));
    const qualityStats = {
      min: qualities.length > 0 ? Math.min(...qualities) : 0,
      max: qualities.length > 0 ? Math.max(...qualities) : 0,
      average: qualities.length > 0 ? qualities.reduce((a, b) => a + b, 0) / qualities.length : 0
    };

    // Get unique chromosomes
    const chromosomes = Array.from(new Set(variants.map(v => v.chromosome))).sort();

    return {
      variants: variants.slice(0, 1000), // Limit to 1000 variants for performance
      totalVariants: variants.length,
      chromosomes,
      qualityStats,
      metadata: {
        fileFormat: metadata.fileFormat || 'Unknown',
        source: metadata.source || 'Unknown',
        referenceGenome: metadata.referenceGenome || 'Unknown',
        processedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Parses INFO field from VCF format
   */
  private parseInfoField(infoString: string): Record<string, any> {
    const info: Record<string, any> = {};
    
    if (!infoString || infoString === '.') {
      return info;
    }

    const pairs = infoString.split(';');
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key) {
        if (value) {
          // Try to parse as number if possible
          const numValue = parseFloat(value);
          info[key] = isNaN(numValue) ? value : numValue;
        } else {
          info[key] = true; // Flag field without value
        }
      }
    }

    return info;
  }

  /**
   * Cleans and normalizes genetic data for analysis
   */
  async normalizeData(processedData: ProcessedGeneticData): Promise<ProcessedGeneticData> {
    // Remove low-quality variants
    const filteredVariants = processedData.variants.filter(v => 
      v.quality > 20 || v.filter === 'PASS'
    );

    // Normalize chromosome names
    const normalizedVariants = filteredVariants.map(v => ({
      ...v,
      chromosome: this.normalizeChromosomeName(v.chromosome)
    }));

    return {
      ...processedData,
      variants: normalizedVariants,
      totalVariants: filteredVariants.length
    };
  }

  /**
   * Normalizes chromosome names (e.g., "chr1" -> "1")
   */
  private normalizeChromosomeName(chromosome: string): string {
    return chromosome.replace(/^chr/i, '');
  }

  /**
   * Generates hash of processed data for Hedera submission
   */
  generateDataHash(processedData: ProcessedGeneticData): string {
    const dataString = JSON.stringify({
      totalVariants: processedData.totalVariants,
      chromosomes: processedData.chromosomes,
      qualityStats: processedData.qualityStats,
      metadata: processedData.metadata
    });
    
    return forge.md.sha256.create().update(dataString).digest().toHex();
  }
}

