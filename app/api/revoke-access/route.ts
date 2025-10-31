export const runtime = 'nodejs';

import { onRequest } from '../../../src/functions/edge/revoke-access';

export async function POST(req: Request) {
  return onRequest(req, {} as any);
}

export async function OPTIONS(req: Request) {
  return onRequest(req, {} as any);
}


