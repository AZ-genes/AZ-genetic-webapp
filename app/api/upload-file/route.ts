export const runtime = 'nodejs';

import { onRequest } from '../../../src/functions/edge/upload-file';
import { firestore, storage, supabase } from '../_context';

export async function POST(req: Request) {
  return onRequest(req, { firestore, storage, supabase });
}

export async function OPTIONS(req: Request) {
  return onRequest(req, { firestore, storage, supabase });
}


