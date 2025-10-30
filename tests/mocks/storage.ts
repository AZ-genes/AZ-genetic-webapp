import fs from 'fs/promises';
import path from 'path';
import { pipeline } from 'stream/promises';

// Mock file storage simulation
export class MockFileStorage {
  private files = new Map<string, Buffer>();
  private metadata = new Map<string, any>();

  async store(id: string, content: Buffer, meta: any) {
    this.files.set(id, content);
    this.metadata.set(id, meta);
  }

  async retrieve(id: string): Promise<{ content: Buffer; metadata: any } | null> {
    const content = this.files.get(id);
    const metadata = this.metadata.get(id);
    if (!content || !metadata) return null;
    return { content, metadata };
  }

  async delete(id: string) {
    this.files.delete(id);
    this.metadata.delete(id);
  }

  clear() {
    this.files.clear();
    this.metadata.clear();
  }
}

// Mock response delay
export function addMockDelay() {
  const delay = parseInt(process.env.MOCK_API_DELAY || '0');
  return new Promise(resolve => setTimeout(resolve, delay));
}

// Helper for handling multipart form data
import { FileUpload, FormFields, MultipartFormData } from '../types/storage';

export async function parseMultipartFormData(req: any): Promise<MultipartFormData> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const result = { files: {}, fields: {} };
    
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    
    req.on('end', async () => {
      try {
        const boundary = req.headers['content-type']?.split('boundary=')[1];
        if (!boundary) {
          throw new Error('No boundary found in multipart form-data');
        }

        const buffer = Buffer.concat(chunks);
        const parts = buffer.toString().split('--' + boundary);
        const result: MultipartFormData = {
          files: {},
          fields: {}
        };
        
        for (const part of parts) {
          if (part.includes('filename=')) {
            const filenameMatch = part.match(/filename="([^"]+)"/);
            const contentTypeMatch = part.match(/Content-Type: ([^\r\n]+)/);
            if (filenameMatch) {
              const filename = filenameMatch[1];
              const contentType = contentTypeMatch?.[1] || 'application/octet-stream';
              const content = Buffer.from(
                part.slice(part.indexOf('\r\n\r\n') + 4).trim()
              );
              result.files[filename] = {
                filename,
                content,
                contentType
              };
            }
          } else if (part.includes('name=')) {
            const matches = part.match(/name="([^"]+)"/);
            if (matches) {
              const name = matches[1];
              const content = part.slice(part.indexOf('\r\n\r\n') + 4);
              result.fields[name] = content.trim();
            }
          }
        }
        
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
    
    req.on('error', reject);
  });
}

// Helper for streaming file responses
export async function streamFileResponse(res: any, content: Buffer, contentType: string) {
  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': content.length
  });
  
  const readable = require('stream').Readable.from(content);
  await pipeline(readable, res);
}