export const runtime = 'nodejs';

import { onRequest } from '../../../src/functions/edge/get-analytics';

export async function GET(req: Request) {
  return onRequest(req, {} as any);
}

export async function OPTIONS(req: Request) {
  return onRequest(req, {} as any);
}


