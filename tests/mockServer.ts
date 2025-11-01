import http from 'http';

import { verifyMockToken } from './mocks/firebase';

let server: http.Server | null = null;
let port = 3000;

// Simple in-memory store for files and access grants
const files = new Map<string, any>();
const grants = new Map<string, Set<string>>();

function genId(prefix = 'file') {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function parseJson(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(Buffer.from(c)));
    req.on('end', () => {
      const s = Buffer.concat(chunks).toString('utf8');
      if (!s) return resolve(null);
      try {
        resolve(JSON.parse(s));
      } catch (err) {
        resolve(null);
      }
    });
    req.on('error', reject);
  });
}

const batches = new Map();

function handleBatch() {
  return {
    delete: (ref: any) => {
      const batchId = Math.random().toString();
      const ops = batches.get(batchId) || [];
      ops.push({ type: 'delete', ref });
      batches.set(batchId, ops);
    },
    commit: async () => {
      // Execute all batched operations
      batches.clear();
    }
  };
}

export function startMockApiServer(p = 3000) {
  port = p;
  return new Promise<void>((resolve, reject) => {
    // if server already started, resolve immediately
    if (server && server.listening) return resolve();

    server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url ?? '', `http://localhost:${port}`);
        const pathname = url.pathname;

        // auth
        const authHeader = req.headers['authorization'] || '';
        const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        const user = token ? verifyMockToken(token) : null;

        // GET /api/get-profile
        if (req.method === 'GET' && pathname === '/api/get-profile') {
          if (!user) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ auth_id: user.uid, subscription_tier: user.user_metadata.subscription_tier }));
          return;
        }

        // POST /api/upload-file
        if (req.method === 'POST' && pathname === '/api/upload-file') {
          if (!user) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
          }

          const tier = user?.user_metadata?.subscription_tier;
          if (tier !== 'F1') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Forbidden' }));
            return;
          }

          // create a fake file record; tests expect file_name 'test.vcf'
          const id = genId();
          const file = { id, owner_auth_id: user.uid, file_name: 'test.vcf' };
          files.set(id, file);

          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(file));
          return;
        }

        // POST /api/grant-access
        if (req.method === 'POST' && pathname === '/api/grant-access') {
          if (!user) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
          }

          const body = await parseJson(req);
          const { fileId, granteeId } = body || {};
          const file = files.get(fileId);
          if (!file) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'File not found' }));
            return;
          }

          // Only owner can grant
          if (file.owner_auth_id !== user.uid) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Forbidden' }));
            return;
          }

          // Can only grant access to F2 users
          // This is a simplified check, in a real app you'd query the user's profile
          if (!granteeId.startsWith('test-auth-id-F2-')) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Can only grant access to F2 users' }));
            return;
          }

          const set = grants.get(fileId) ?? new Set<string>();
          set.add(granteeId);
          grants.set(fileId, set);

          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
          return;
        }

        // POST /api/revoke-access
        if (req.method === 'POST' && pathname === '/api/revoke-access') {
          if (!user) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
          }

          const body = await parseJson(req);
          const { fileId, granteeId } = body || {};
          const file = files.get(fileId);
          if (!file) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'File not found' }));
            return;
          }

          // Only owner can revoke
          if (file.owner_auth_id !== user.uid) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Forbidden' }));
            return;
          }

          const set = grants.get(fileId);
          if (!set || !set.has(granteeId)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Access not found' }));
            return;
          }

          set.delete(granteeId);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
          return;
        }

        // GET /api/get-file
        if (req.method === 'GET' && pathname === '/api/get-file') {
          if (!user) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
          }

          const fileId = url.searchParams.get('fileId');
          const file = files.get(fileId ?? '');
          if (!file) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not found' }));
            return;
          }

          // allowed if owner or granted
          const allowed = file.owner_auth_id === user.id || (grants.get(fileId ?? '')?.has(user.id));
          if (!allowed) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Forbidden' }));
            return;
          }

          // Return file binary surrogate with expected content-type used in tests
          res.writeHead(200, { 'Content-Type': 'chemical/x-vcf' });
          res.end('VCF-DATA');
          return;
        }

        // DELETE /api/files/:id
        if (req.method === 'DELETE' && pathname.startsWith('/api/files/')) {
          if (!user) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
          }

          const fileId = pathname.split('/').pop();
          const file = files.get(fileId ?? '');
          if (!file) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not found' }));
            return;
          }

          // Only owner can delete
          if (file.owner_auth_id !== user.id) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Forbidden' }));
            return;
          }

          files.delete(fileId ?? '');
          grants.delete(fileId ?? '');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
          return;
        }

        // GET /api/get-analytics
        if (req.method === 'GET' && pathname === '/api/get-analytics') {
          if (!user) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
          }

          const tier = user?.user_metadata?.subscription_tier;
          if (tier !== 'F3') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Forbidden' }));
            return;
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ data: [], metadata: {} }));
          return;
        }

        // default 404
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(err) }));
      }
    });

    server.on('error', (err: any) => {
      // If port is already in use (another suite started the server), resolve instead of failing
      if (err && err.code === 'EADDRINUSE') return resolve();
      reject(err);
    });
    server.listen(port, () => resolve());
  });
}

export function stopMockApiServer() {
  return new Promise<void>((resolve) => {
    if (!server) return resolve();
    server.close(() => {
      server = null;
      resetMockApiServer();
      resolve();
    });
  });
}

export function resetMockApiServer() {
  files.clear();
  grants.clear();
}
