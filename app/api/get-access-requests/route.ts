export const runtime = 'nodejs';

import { onRequest } from '../../../src/functions/edge/get-access-requests';

export async function GET(req: Request) {
  return onRequest(req, {} as any);
}
