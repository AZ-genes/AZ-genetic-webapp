// Helper functions for mock server

export function validateFileUpload(contentType?: string, fileName?: string): { valid: boolean; error?: string } {
  if (!contentType) {
    return { valid: false, error: 'Missing Content-Type' };
  }
  if (contentType !== 'chemical/x-vcf') {
    return { valid: false, error: 'Invalid file type' };
  }
  if (!fileName) {
    return { valid: false, error: 'Missing file name' };
  }
  if (!fileName.endsWith('.vcf')) {
    return { valid: false, error: 'Invalid file extension' };
  }
  return { valid: true };
}

export function parseFormData(req: any): Promise<{ fileName?: string; contentType?: string }> {
  return new Promise((resolve) => {
    let fileName: string | undefined;
    let contentType: string | undefined;
    
    // Simple form-data parser for tests
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      const boundary = req.headers['content-type'].split('boundary=')[1];
      let data = '';
      
      req.on('data', (chunk: Buffer) => {
        data += chunk.toString();
      });
      
      req.on('end', () => {
        const parts = data.split(boundary);
        for (const part of parts) {
          if (part.includes('filename=')) {
            fileName = part.match(/filename="([^"]+)"/)?.[1];
          }
          if (part.includes('Content-Type:')) {
            contentType = part.match(/Content-Type: ([^\r\n]+)/)?.[1];
          }
        }
        resolve({ fileName, contentType });
      });
    } else {
      resolve({ fileName: undefined, contentType: undefined });
    }
  });
}