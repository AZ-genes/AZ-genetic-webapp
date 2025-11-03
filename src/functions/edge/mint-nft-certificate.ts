import { HederaClient } from '../../services/hedera/client';
import { AuthContext, corsHeaders } from './utils';
import { withAuth } from './middleware/auth';
import { AccountId, TokenId } from '@hashgraph/sdk';

const hederaClient = new HederaClient();

interface MintNFTCertificateRequest {
  fileId: string;
  metadata?: {
    name?: string;
    description?: string;
    image?: string;
    attributes?: Array<{ trait_type: string; value: string | number }>;
  };
}

async function handleMintNFTCertificate(req: Request, context: AuthContext): Promise<Response> {
  if (req.method !== 'POST') {
    throw new Error('Method not allowed');
  }

  try {
    if (!context.user) {
      throw new Error('User not authenticated');
    }

    // Get user profile
    const { data: profile, error: profileError } = await context.supabase
      .from('user_profiles')
      .select()
      .eq('auth_id', context.user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    const body: MintNFTCertificateRequest = await req.json();
    const { fileId, metadata } = body;

    if (!fileId) {
      throw new Error('File ID is required');
    }

    // Get file information
    const { data: file, error: fileError } = await context.supabase
      .from('files')
      .select()
      .eq('id', fileId)
      .single();

    if (fileError || !file) {
      throw new Error('File not found');
    }

    // Verify user owns the file
    if (file.owner_id !== profile.id) {
      throw new Error('Unauthorized: You do not own this file');
    }

    // Check if file already has an NFT
    if (file.nft_token_id && file.nft_serial_number) {
      throw new Error('This file already has an NFT certificate');
    }

    // Get the NFT collection token ID from environment or create one
    // For simplicity, we'll assume a collection token ID exists in env
    const collectionTokenId = process.env.HEDERA_NFT_COLLECTION_TOKEN_ID;
    
    if (!collectionTokenId) {
      throw new Error('NFT collection not configured. Please set HEDERA_NFT_COLLECTION_TOKEN_ID');
    }

    const tokenId = TokenId.fromString(collectionTokenId);

    // Prepare metadata following HIP-412 standard
    const nftMetadata = {
      name: metadata?.name || `${file.file_name} Certificate`,
      description: metadata?.description || `NFT Certificate for ${file.file_name}`,
      creator: 'AZ-Genes',
      image: metadata?.image || '',
      type: 'Certificate',
      version: '1.0',
      attributes: metadata?.attributes || [
        { trait_type: 'File Name', value: file.file_name },
        { trait_type: 'File Type', value: file.file_type },
        { trait_type: 'Upload Date', value: new Date(file.created_at).toISOString() }
      ]
    };

    // Convert metadata to bytes
    const metadataBytes = new TextEncoder().encode(JSON.stringify(nftMetadata));

    // Mint NFT on Hedera
    const serialNumber = await hederaClient.mintNFTCertificate(tokenId, metadataBytes);

    // Get operator account for storing transaction info
    const operatorId = AccountId.fromString(process.env.HEDERA_OPERATOR_ID || '');

    // Create transaction ID (we'll use a placeholder since we only get serial number back)
    // In production, you'd want to get the actual transaction ID from the mint operation
    const hederaTxId = `${tokenId.toString()}-${serialNumber}`;

    // Update file with NFT information
    const { data: updatedFile, error: updateError } = await context.supabase
      .from('files')
      .update({
        nft_token_id: tokenId.toString(),
        nft_serial_number: serialNumber
      })
      .eq('id', fileId)
      .select()
      .single();

    if (updateError) {
      throw new Error('Failed to update file with NFT information');
    }

    // Store NFT certificate in database
    const { data: nftCert, error: nftError } = await context.supabase
      .from('nft_certificates')
      .insert({
        file_id: fileId,
        owner_id: profile.id,
        token_id: tokenId.toString(),
        serial_number: serialNumber,
        hedera_transaction_id: hederaTxId,
        metadata: nftMetadata
      })
      .select()
      .single();

    if (nftError) {
      throw new Error('Failed to store NFT certificate');
    }

    return new Response(JSON.stringify({
      nft: nftCert,
      tokenId: tokenId.toString(),
      serialNumber: serialNumber
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = error instanceof Error && message.includes('Unauthorized') ? 403 : 500;

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
export const onRequest = (req: Request, context: AuthContext) =>
  withAuth(req, context, handleMintNFTCertificate);

