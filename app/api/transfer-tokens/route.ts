export const runtime = 'nodejs';

import { onRequest } from '../../../src/functions/edge/transfer-tokens';

export async function POST(req: Request) {
  return onRequest(req, {} as any);
}
