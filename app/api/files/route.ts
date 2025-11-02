export const runtime = 'nodejs';

import { onRequest } from '../../../src/functions/edge/get-files';
import { firestore, storage, supabase } from '../_context';

export async function GET(req: Request) {
  return onRequest(req, { firestore, storage, supabase });
}
