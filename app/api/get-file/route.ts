export const runtime = 'nodejs';

import { onRequest } from '../../../src/functions/edge/get-file';
import { supabase } from '../_context';

export async function GET(req: Request) {
  return onRequest(req, { supabase });
}

export async function OPTIONS(req: Request) {
  return onRequest(req, { supabase });
}


