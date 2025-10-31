export const runtime = 'nodejs';

import { onRequest } from '../../../../src/functions/edge/delete-file';

export async function DELETE(req: Request) {
  return onRequest(req, {} as any);
}

export async function OPTIONS(req: Request) {
  return onRequest(req, {} as any);
}


