export const runtime = 'nodejs';

import { onRequest } from '../../../src/functions/edge/get-files';

export async function GET(req: Request) {
  return onRequest(req, {} as any);
}
