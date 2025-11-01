import { ContractId } from '@hashgraph/sdk';
import { HederaClient } from '../../services/hedera/client';
import { FilePermission } from './types';
import { AuthContext, corsHeaders } from './utils';
import { withAuth } from './middleware/auth';

interface RevokeAccessRequest {
  fileId: string;
  granteeId: string;
  reason?: string;
}

const hederaClient = new HederaClient();
let CONTRACT_ID: ContractId | null = null;
try {
  if (process.env.HEDERA_CONTRACT_ID) {
    CONTRACT_ID = ContractId.fromString(process.env.HEDERA_CONTRACT_ID);
  }
} catch {
  console.warn('Failed to parse HEDERA_CONTRACT_ID');
}

async function notifyRevocation(
  firestore: AuthContext['firestore'],
  granteeId: string,
  fileMetadata: any,
  granterId: string,
  reason?: string
) {
  try {
    const granteeRef = firestore.collection('user_profiles').doc(granteeId);
    const granteeDoc = await granteeRef.get();
    const grantee = granteeDoc.data();

    if (grantee?.email) {
      // In production, implement proper email notification system
      console.log(`Would send email to ${grantee.email} about access revocation`);
    }

    await firestore.collection('notifications').add({
      user_id: granteeId,
      type: 'access_revoked',
      message: `Your access to file: ${fileMetadata.file_name} has been revoked`,
      metadata: {
        file_id: fileMetadata.id,
        revoked_by: granterId,
        reason
      }
    });
  } catch (error) {
    console.error('Failed to send revocation notification:', error);
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

async function validateActivePermission(
  firestore: AuthContext['firestore'],
  fileId: string,
  granteeId: string
): Promise<FilePermission> {
  const permissionsQuery = firestore.collection('file_permissions')
    .where('file_id', '==', fileId)
    .where('grantee_id', '==', granteeId)
    .where('status', '==', 'active');
  const snapshot = await permissionsQuery.get();

  if (snapshot.empty) {
    throw new Error('No active permission found for this user');
  }

  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as FilePermission;
}

async function validateRequestBody(req: Request): Promise<RevokeAccessRequest> {
  const body = await req.json() as RevokeAccessRequest;
  if (!body.fileId || !body.granteeId) {
    throw new Error('Missing required fields: fileId, granteeId');
  }
  return body;
}

async function handleRevokeAccess(req: Request, context: AuthContext): Promise<Response> {
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
        throw new Error('Only F1 users can revoke access');
      }

      const body = await validateRequestBody(req);
      const file = await validateFileOwnership(firestore, body.fileId, profileId);
      const permission = await validateActivePermission(firestore, body.fileId, body.granteeId);

      // Record revocation on Hedera
      const hederaTxId = CONTRACT_ID 
        ? await hederaClient.revokeAccess(CONTRACT_ID, body.fileId, body.granteeId)
        : `mock-revoke-${Date.now()}`;

      // Update permission status
      const permissionRef = firestore.collection('file_permissions').doc(permission.id);
      transaction.update(permissionRef, {
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revoked_by: profileId,
        revocation_reason: body.reason || null,
        revocation_transaction_id: hederaTxId
      });

      // Log the revocation
      const accessLogRef = firestore.collection('access_logs').doc();
      transaction.set(accessLogRef, {
        file_id: body.fileId,
        grantor_id: profileId,
        grantee_id: body.granteeId,
        action: 'revoke_access',
        metadata: {
          reason: body.reason,
          permission_id: permission.id,
          hedera_transaction_id: hederaTxId
        }
      });

      // Notify user of revocation (non-blocking)
      notifyRevocation(
        firestore,
        body.granteeId,
        file,
        profileId,
        body.reason
      ).catch(console.error);
    });

    return new Response(JSON.stringify({
      message: 'Access revoked successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    // Log the error
    try {
      await firestore.collection('error_logs').add({
        error_type: 'revoke_access_failed',
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
    return await withAuth(req, context, handleRevokeAccess);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = error instanceof Error &&
      (message.includes('access denied') ||
        message.includes('not found') ||
        message.includes('Invalid')) ? 400 : 500;

    return new Response(JSON.stringify({
      error: message,
      code: error instanceof Error ? error.name : 'UnknownError'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: statusCode
    });
  }
}