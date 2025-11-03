export const runtime = 'nodejs';

import { handler } from '../../../src/functions/edge/get-analytics';

export async function GET(req: Request) {
  return handler(req);
}

export async function OPTIONS(req: Request) {
  return handler(req);
}


