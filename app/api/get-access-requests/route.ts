export const runtime = 'nodejs';

import { onRequest } from '../../../src/functions/edge/get-access-requests';
import { supabase } from '../_context';

export async function GET(req: Request) {
  return onRequest(req, { supabase });
}
