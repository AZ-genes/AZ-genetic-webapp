import { ContractId } from '@hashgraph/sdk';
import { HederaClient } from '../../services/hedera/client';
import { FilePermission } from './types';
import { AuthContext, corsHeaders } from './utils';
import { withAuth } from './middleware/auth';

interface ExtendedPermission extends FilePermission {
  expires_at: string;
  access_level: 'read' | 'read_write';
  status: 'active' | 'revoked' | 'expired';
}

interface GrantAccessRequest {
  fileId: string;
  granteeId: string;
  expiresAt?: string;
  accessLevel?: 'read' | 'read_write';
  notes?: string;
}

// Constants
const MAX_GRANTS_PER_DAY = 50;
const GRANT_WINDOW = 86400000; // 24 hours in milliseconds
const MAX_EXPIRY_DAYS = 365; // Maximum 1 year access grant
const DEFAULT_EXPIRY_DAYS = 30; // Default 30 days access

const hederaClient = new HederaClient();
let CONTRACT_ID: ContractId | null = null;
try {
  if (process.env.HEDERA_CONTRACT_ID) {
    CONTRACT_ID = ContractId.fromString(process.env.HEDERA_CONTRACT_ID);
  }
} catch {
  console.warn('Failed to parse HEDERA_CONTRACT_ID');
}

// Rate limiting map (in production, use Redis)
const grantLimits = new Map<string, { count: number; lastReset: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = grantLimits.get(userId) || { count: 0, lastReset: now };

  if (now - userLimit.lastReset > GRANT_WINDOW) {
    userLimit.count = 0;
    userLimit.lastReset = now;
  }

  if (userLimit.count >= MAX_GRANTS_PER_DAY) {
    return false;
  }

  userLimit.count++;
  grantLimits.set(userId, userLimit);
  return true;
}

async function validateExpiryDate(expiresAt: string | undefined): Promise<string> {
  const now = new Date();
  let expiry: Date;

  if (!expiresAt) {
    expiry = new Date(now.getTime() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  } else {
    expiry = new Date(expiresAt);
    if (isNaN(expiry.getTime())) {
      throw new Error('Invalid expiration date format');
    }

    const maxExpiry = new Date(now.getTime() + MAX_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    if (expiry > maxExpiry) {
      throw new Error(`Maximum expiration date is ${MAX_EXPIRY_DAYS} days from now`);
    }

    if (expiry <= now) {
      throw new Error('Expiration date must be in the future');
    }
  }

  return expiry.toISOString();
}

async function notifyGrantee(
  firestore: AuthContext['firestore'], 
  granteeId: string, 
  fileMetadata: any, 
  granterId: string
) {
  try {
    const granteeRef = firestore.collection('user_profiles').doc(granteeId);
    const granteeDoc = await granteeRef.get();
    const grantee = granteeDoc.data();

    if (grantee?.email) {
      // In production, implement proper email notification system
      console.log(`Would send email to ${grantee.email} about new file access`);
    }

    await firestore.collection('notifications').add({
      user_id: granteeId,
      type: 'access_granted',
      message: `You've been granted access to file: ${fileMetadata.file_name}`,
      metadata: {
        file_id: fileMetadata.id,
        granted_by: granterId
      }
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

async function validateFileOwnership(
  firestore: AuthContext['firestore'],
  fileId: string, 
  ownerId: string
) {
  const fileRef = firestore.collection('files').doc(fileId);
  const fileDoc = await fileRef.get();

  if (!fileDoc.exists || fileDoc.data().owner_id !== ownerId) {
    throw new Error('File not found or access denied');
  }

  return fileDoc.data();
}

async function validateGrantee(
  firestore: AuthContext['firestore'],
  granteeId: string
) {
  const granteeRef = firestore.collection('user_profiles').doc(granteeId);
  const granteeDoc = await granteeRef.get();

  if (!granteeDoc.exists) {
    throw new Error('Grantee not found');
  }

  const grantee = granteeDoc.data();
  if (grantee.subscription_tier !== 'F2') {
    throw new Error('Can only grant access to F2 users');
  }

  return grantee;
}

async function checkExistingPermissions(
  firestore: AuthContext['firestore'],
  fileId: string, 
  granteeId: string
) {
  const permissionsQuery = firestore.collection('file_permissions')
    .where('file_id', '==', fileId)
    .where('grantee_id', '==', granteeId)
    .where('status', '==', 'active');
  const snapshot = await permissionsQuery.get();

  if (!snapshot.empty) {
    throw new Error('Access already granted to this user');
  }
}



async function validateRequestBody(req: Request): Promise<GrantAccessRequest> {
  const body = await req.json() as GrantAccessRequest;
  if (!body.fileId || !body.granteeId) {
    throw new Error('Missing required fields: fileId, granteeId');
  }

  if (body.accessLevel && !['read', 'read_write'].includes(body.accessLevel)) {
    throw new Error('Invalid access level. Must be "read" or "read_write"');
  }

  return body;
}

async function handleGrantAccess(req: Request, context: AuthContext): Promise<Response> {
  if (!context.user) {
    throw new Error('User not authenticated');
  }

  const { user, firestore } = context;

  try {
    await firestore.runTransaction(async (transaction: any) => {
      const profileRef = firestore.collection('user_profiles').doc(user.uid);
      const profileDoc = await transaction.get(profileRef);

      if (!profileDoc.exists) {
        throw new Error('User profile not found');
      }
      const profile = profileDoc.data();
      // Profile ID is the Firestore document ID
      const profileId = profileDoc.id;

      if (profile.subscription_tier !== 'F1') {
        throw new Error('Only F1 users can grant access');
      }

      const body = await validateRequestBody(req);
      const file = await validateFileOwnership(firestore, body.fileId, profileId);
      await validateGrantee(firestore, body.granteeId);
      
      if (!checkRateLimit(profileId)) {
        throw new Error(`Grant limit exceeded. Maximum ${MAX_GRANTS_PER_DAY} grants per day.`);
      }

      await checkExistingPermissions(firestore, body.fileId, body.granteeId);
      const expiresAt = await validateExpiryDate(body.expiresAt);

      const hederaTxId = CONTRACT_ID 
        ? await hederaClient.grantAccess(CONTRACT_ID, body.fileId, body.granteeId)
        : `mock-grant-${Date.now()}`;

      const permission: Partial<ExtendedPermission> = {
        file_id: body.fileId,
        grantee_id: body.granteeId,
        granted_by: profileId,
        hedera_transaction_id: hederaTxId,
        expires_at: expiresAt,
        access_level: body.accessLevel || 'read',
        status: 'active'
      };

      const permissionRef = firestore.collection('file_permissions').doc();
      transaction.set(permissionRef, permission);

      const accessLogRef = firestore.collection('access_logs').doc();
      transaction.set(accessLogRef, {
        file_id: body.fileId,
        grantor_id: profileId,
        grantee_id: body.granteeId,
        action: 'grant_access',
        metadata: {
          expires_at: expiresAt,
          access_level: body.accessLevel || 'read',
          notes: body.notes
        }
      });

      // Notify grantee
      notifyGrantee(firestore, body.granteeId, file, profileId).catch(console.error);
    });

    return new Response(JSON.stringify({
      message: 'Access granted successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201
    });

  } catch (error) {
    // Log the error
    try {
      await firestore.collection('error_logs').add({
        error_type: 'grant_access_failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          request_url: req.url,
          timestamp: new Date().toISOString(),
          user_id: context.user.id
        }
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    throw error;
  }
}

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
    return await withAuth(req, context, handleGrantAccess);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = error instanceof Error && 
      (message.includes('limit exceeded') || 
       message.includes('access denied') ||
       message.includes('already granted') ||
       message.includes('Invalid') ||
       message.includes('not found')) ? 400 : 500;

    return new Response(JSON.stringify({ 
      error: message,
      code: error instanceof Error ? error.name : 'UnknownError'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: statusCode
    });
  }
}