import { EncryptionService } from '../../services/encryption';
import { HederaClient } from '../../services/hedera/client';
import { GeneticETLService } from '../../services/genetic/etl';
import { FileMetadata } from './types';
import { AuthContext, corsHeaders } from './utils';
import { withAuth } from './middleware/auth';

const encryptionService = new EncryptionService();
const hederaClient = new HederaClient();
const etlService = new GeneticETLService();
const TOPIC_ID = process.env.HEDERA_TOPIC_ID ?? '';

// Constants
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_FILE_TYPES = new Set([
  'application/pdf', // Medical reports
  'text/plain',     // TXT files
  'text/csv',       // CSV files
  'chemical/x-vcf'  // VCF files
]);

// Rate limiting map (in production, use Redis)
const uploadLimits = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT = 10; // uploads per hour
const RATE_WINDOW = 3600000; // 1 hour in milliseconds

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = uploadLimits.get(userId) || { count: 0, lastReset: now };

  // Reset counter if window has passed
  if (now - userLimit.lastReset > RATE_WINDOW) {
    userLimit.count = 0;
    userLimit.lastReset = now;
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  uploadLimits.set(userId, userLimit);
  return true;
}

async function validateGeneticFile(fileBuffer: Buffer, fileType: string): Promise<boolean> {
  // Basic validation for VCF files
  if (fileType === 'chemical/x-vcf') {
    const content = fileBuffer.toString('utf-8').slice(0, 1000); // Check first 1000 chars
    return content.includes('##fileformat=VCF');
  }
  return true;
}

async function handleFileUpload(req: Request, context: AuthContext): Promise<Response> {
  if (req.method !== 'POST') {
    throw new Error('Method not allowed');
  }

  let uploadedFilePath: string | null = null;
  const { user, firestore, storage } = context;

  try {

    if (!user) {
      throw new Error('User not authenticated');
    }

    const profileRef = firestore.collection('user_profiles').doc(user.uid);
    const profileDoc = await profileRef.get();

    if (!profileDoc.exists) {
      throw new Error('User profile not found');
    }
    const profile = profileDoc.data();
    // Profile ID is the Firestore document ID
    const profileId = profileDoc.id;

    // Check rate limit
    if (!checkRateLimit(profileId)) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Get file from request
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      throw new Error('No file provided');
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.has(file.type)) {
      throw new Error('Invalid file type. Supported types: PDF, TXT, CSV, VCF');
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds limit of 100MB');
    }

    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Validate genetic file format if applicable
    if (!await validateGeneticFile(fileBuffer, file.type)) {
      throw new Error('Invalid genetic file format');
    }

    // Process genetic data if VCF file
    let processedData = null;
    if (file.type === 'chemical/x-vcf') {
      try {
        const vcfContent = fileBuffer.toString('utf-8');
        processedData = await etlService.processVCFFile(vcfContent);
        const normalized = await etlService.normalizeData(processedData);
        processedData = normalized;
      } catch (error) {
        console.error('Failed to process VCF file:', error);
        // Continue with upload even if processing fails
      }
    }

    // Encrypt file
    const { encryptedData, key, iv, hash } = await encryptionService.encryptFile(fileBuffer);

    // Upload encrypted file to Firebase Storage
    const timestamp = new Date().toISOString();
    const storagePath = `${profileId}/${timestamp}-${file.name}`;
    uploadedFilePath = storagePath;
    
    const storageRef = storage.ref(storagePath);
    await storage.uploadBytes(storageRef, encryptedData);

    // Use processed data hash for Hedera if available, otherwise use encrypted file hash
    let hederaHash = hash;
    if (processedData) {
      hederaHash = etlService.generateDataHash(processedData);
    }

    // Submit hash to Hedera (will return mock hash if topic ID is missing or client unavailable)
    const hederaTxId = TOPIC_ID ? await hederaClient.submitHash(TOPIC_ID, hederaHash) : `mock-hash-${Date.now()}`;

    // Save file metadata
    const fileMetadata: Partial<FileMetadata> = {
      owner_id: profileId,
      file_name: file.name,
      file_type: file.type,
      storage_path: storagePath,
      encryption_key: key,
      encryption_iv: iv,
      hash,
      hedera_transaction_id: hederaTxId
    };

    const savedFileRef = await firestore.collection('files').add(fileMetadata);
    const savedFile = { id: savedFileRef.id, ...fileMetadata };

    // Save processed genetic data if available
    if (processedData) {
      await firestore.collection('genetic_data').add({
        file_id: savedFile.id,
        processed_data: processedData,
        hedera_hash: hederaHash,
        hedera_transaction_id: hederaTxId,
        created_at: new Date().toISOString()
      });
    }

    // Log the file upload
    await firestore.collection('file_access_logs').add({
      file_id: savedFile.id,
      user_id: profileId,
      access_type: 'upload',
      status: 'success',
      metadata: {
        file_name: savedFile.file_name,
        file_type: savedFile.file_type,
        storage_path: savedFile.storage_path,
        hedera_transaction_id: savedFile.hedera_transaction_id,
        processed: !!processedData
      }
    });

    return new Response(JSON.stringify(savedFile), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201
    });

  } catch (error) {
    // Cleanup uploaded file if exists
    if (uploadedFilePath) {
      try {
        const storageRef = storage.ref(uploadedFilePath);
        await storage.deleteObject(storageRef);
      } catch (cleanupError) {
        console.error('Failed to cleanup uploaded file:', cleanupError);
      }
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = error instanceof Error && 
      (message.includes('Rate limit') || message.includes('Invalid file type')) ? 400 : 500;

    return new Response(JSON.stringify({ 
      error: message,
      code: error instanceof Error ? error.name : 'UnknownError'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: statusCode
    });
  }
}

// Export the handler with auth middleware
export async function onRequest(req: Request, context: AuthContext): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ 
      error: 'Method not allowed',
      code: 'MethodNotAllowed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405
    });
  }

  try {
    return await withAuth(req, context, handleFileUpload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = error instanceof Error && 
      (message.includes('Rate limit') || message.includes('Invalid file type')) ? 400 : 500;

    return new Response(JSON.stringify({ 
      error: message,
      code: error instanceof Error ? error.name : 'UnknownError'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: statusCode
    });
  }
}