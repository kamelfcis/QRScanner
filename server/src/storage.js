import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  isR2Enabled,
  putObject as r2PutObject,
  getObject as r2GetObject,
  deleteObject as r2DeleteObject,
  listObjects as r2ListObjects,
  publicUrl as r2PublicUrl,
} from './r2-storage.js';

const PUBLIC_BUCKETS = new Set([
  'logos',
  'covers',
  'categories',
  'products',
  'assets',
  'qr',
  'instapay-proofs',
  'gallery',
]);

const LIMITS = {
  logos: 5 * 1024 * 1024,
  covers: 5 * 1024 * 1024,
  categories: 5 * 1024 * 1024,
  products: 5 * 1024 * 1024,
  assets: 5 * 1024 * 1024,
  qr: 5 * 1024 * 1024,
  gallery: 5 * 1024 * 1024,
  'instapay-proofs': 5 * 1024 * 1024,
  pdfs: 10 * 1024 * 1024,
};

export function storageRoot() {
  return process.env.STORAGE_DIR || path.resolve(process.cwd(), 'storage-data');
}

export function ensureBuckets() {
  if (isR2Enabled()) return;
  const root = storageRoot();
  for (const bucket of [...PUBLIC_BUCKETS, 'pdfs', 'imports']) {
    fs.mkdirSync(path.join(root, bucket), { recursive: true });
  }
}

function assertBucket(bucket) {
  if (!/^[a-z0-9-]+$/i.test(bucket || '')) {
    throw Object.assign(new Error('Invalid bucket'), { status: 400 });
  }
  if (isR2Enabled()) return bucket;
  const dir = path.join(storageRoot(), bucket);
  if (!fs.existsSync(dir)) {
    throw Object.assign(new Error('Bucket not found'), { status: 404 });
  }
  return dir;
}

function safeKey(key) {
  const parts = String(key || '')
    .split('/')
    .filter((part) => part && part !== '.' && part !== '..');
  if (!parts.length) throw Object.assign(new Error('Invalid path'), { status: 400 });
  return parts.join('/');
}

function filePath(bucket, key) {
  const dir = assertBucket(bucket);
  const rel = safeKey(key);
  const full = path.resolve(dir, rel);
  if (!full.startsWith(path.resolve(dir))) {
    throw Object.assign(new Error('Invalid path'), { status: 400 });
  }
  return { full, rel };
}

function canWrite(auth) {
  return auth.role === 'authenticated' || auth.role === 'service_role';
}

async function readBody(request) {
  const type = String(request.headers['content-type'] || '');
  if (type.includes('multipart/form-data')) {
    let file;
    const parts = request.parts();
    for await (const part of parts) {
      if (part.type === 'file') {
        file = { buffer: await part.toBuffer(), mime: part.mimetype };
      }
    }
    if (!file) throw Object.assign(new Error('File missing'), { status: 400 });
    return file;
  }
  if (Buffer.isBuffer(request.body)) {
    return { buffer: request.body, mime: type.split(';')[0] };
  }
  throw Object.assign(new Error('Unsupported upload body'), { status: 400 });
}

async function saveObject(bucket, key, buffer, mime, upsert) {
  const rel = safeKey(key);
  const limit = LIMITS[bucket];
  if (limit && buffer.length > limit) {
    throw Object.assign(new Error('File too large'), { status: 413 });
  }

  if (isR2Enabled()) {
    assertBucket(bucket);
    if (!upsert) {
      try {
        await r2GetObject(bucket, rel);
        throw Object.assign(new Error('The resource already exists'), { status: 400, statusCode: 409 });
      } catch (error) {
        const code = error.$metadata?.httpStatusCode;
        const missing =
          error.status === 404 ||
          code === 404 ||
          error.name === 'NoSuchKey' ||
          error.name === 'NotFound';
        if (error.statusCode === 409 || !missing) throw error;
      }
    }
    await r2PutObject(bucket, rel, buffer, mime);
    return { Id: crypto.randomUUID(), Key: `${bucket}/${rel}`, path: rel };
  }

  const { full } = filePath(bucket, key);
  if (fs.existsSync(full) && !upsert) {
    throw Object.assign(new Error('The resource already exists'), { status: 400, statusCode: 409 });
  }
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, buffer);
  const metaPath = `${full}.meta.json`;
  fs.writeFileSync(
    metaPath,
    JSON.stringify({ mimetype: mime || 'application/octet-stream', size: buffer.length, created_at: new Date().toISOString() })
  );
  return { Id: crypto.randomUUID(), Key: `${bucket}/${rel}`, path: rel };
}

async function readObject(bucket, key) {
  const rel = safeKey(key);
  if (isR2Enabled()) {
    try {
      return await r2GetObject(bucket, rel);
    } catch (error) {
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        throw Object.assign(new Error('Object not found'), { status: 404 });
      }
      throw error;
    }
  }
  const { full } = filePath(bucket, key);
  if (!fs.existsSync(full)) throw Object.assign(new Error('Object not found'), { status: 404 });
  let mimetype = 'application/octet-stream';
  const metaFile = `${full}.meta.json`;
  if (fs.existsSync(metaFile)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
      if (meta.mimetype) mimetype = meta.mimetype;
    } catch {
      // keep default
    }
  }
  return { buffer: fs.readFileSync(full), mimetype };
}

async function removeObject(bucket, prefix) {
  const rel = safeKey(prefix);
  if (isR2Enabled()) {
    await r2DeleteObject(bucket, rel);
    return { name: rel };
  }
  const { full } = filePath(bucket, prefix);
  if (fs.existsSync(full)) fs.rmSync(full, { force: true });
  const meta = `${full}.meta.json`;
  if (fs.existsSync(meta)) fs.rmSync(meta, { force: true });
  return { name: rel };
}

async function listObjects(bucket, body) {
  if (isR2Enabled()) {
    assertBucket(bucket);
    return r2ListObjects(bucket, body);
  }
  const dir = assertBucket(bucket);
  const prefix = String(body.prefix || '').replace(/^\/+|\/+$/g, '');
  const base = prefix ? path.resolve(dir, prefix) : dir;
  if (!base.startsWith(path.resolve(dir)) || !fs.existsSync(base)) return [];
  const names = fs.readdirSync(base, { withFileTypes: true });
  let files = names
    .filter((entry) => entry.isFile() && !entry.name.endsWith('.meta.json'))
    .map((entry) => {
      const full = path.join(base, entry.name);
      const stat = fs.statSync(full);
      let metadata = { size: stat.size, mimetype: 'application/octet-stream' };
      const metaFile = `${full}.meta.json`;
      if (fs.existsSync(metaFile)) {
        try {
          metadata = { ...metadata, ...JSON.parse(fs.readFileSync(metaFile, 'utf8')) };
        } catch {
          // keep stat metadata
        }
      }
      return {
        name: entry.name,
        id: entry.name,
        updated_at: stat.mtime.toISOString(),
        created_at: metadata.created_at || stat.birthtime.toISOString(),
        last_accessed_at: stat.atime.toISOString(),
        metadata,
      };
    });
  const search = String(body.search || '').toLowerCase();
  if (search) files = files.filter((file) => file.name.toLowerCase().includes(search));
  const column = body.sortBy?.column || 'name';
  const desc = String(body.sortBy?.order || 'asc').toLowerCase() === 'desc';
  files.sort((a, b) => {
    const left = column === 'created_at' || column === 'updated_at' ? a[column] : a.name;
    const right = column === 'created_at' || column === 'updated_at' ? b[column] : b.name;
    if (left < right) return desc ? 1 : -1;
    if (left > right) return desc ? -1 : 1;
    return 0;
  });
  const offset = Number(body.offset || 0);
  const limit = Number(body.limit || 100);
  return files.slice(offset, offset + limit);
}

export function registerStorage(app, { resolveAuth }) {
  ensureBuckets();

  app.post('/storage/v1/object/list/:bucket', async (request, reply) => {
    const auth = resolveAuth(request);
    if (auth.invalid) return reply.code(401).send({ message: 'Invalid JWT', statusCode: '401' });
    if (!PUBLIC_BUCKETS.has(request.params.bucket) && !canWrite(auth)) {
      return reply.code(400).send({ message: 'permission denied', statusCode: '403' });
    }
    try {
      return reply.send(await listObjects(request.params.bucket, request.body || {}));
    } catch (error) {
      return reply.code(error.status || 400).send({ message: error.message, statusCode: String(error.status || 400) });
    }
  });

  app.get('/storage/v1/object/public/*', async (request, reply) => {
    const url = request.url.split('?')[0];
    const rest = decodeURIComponent(url.split('/storage/v1/object/public/')[1] || '');
    const slash = rest.indexOf('/');
    if (slash < 1) return reply.code(404).send({ message: 'Not found' });
    const bucket = rest.slice(0, slash);
    const key = rest.slice(slash + 1);
    if (!PUBLIC_BUCKETS.has(bucket)) return reply.code(400).send({ message: 'Bucket is not public' });
    try {
      const object = await readObject(bucket, key);
      reply.header('content-type', object.mimetype);
      reply.header('cache-control', 'public, max-age=31536000');
      return reply.send(object.buffer);
    } catch (error) {
      return reply.code(error.status || 400).send({ message: error.message });
    }
  });

  app.route({
    method: ['POST', 'PUT'],
    url: '/storage/v1/object/*',
    handler: async (request, reply) => {
      const auth = resolveAuth(request);
      if (auth.invalid || !canWrite(auth)) {
        return reply.code(401).send({ message: 'permission denied', statusCode: '403' });
      }
      const url = request.url.split('?')[0];
      const rest = decodeURIComponent(url.split('/storage/v1/object/')[1] || '');
      const slash = rest.indexOf('/');
      if (slash < 1) return reply.code(400).send({ message: 'Invalid path' });
      const bucket = rest.slice(0, slash);
      const key = rest.slice(slash + 1);
      try {
        assertBucket(bucket);
        const file = await readBody(request);
        const upsert = String(request.headers['x-upsert'] || 'false') === 'true' || request.method === 'PUT';
        const saved = await saveObject(bucket, key, file.buffer, file.mime, upsert);
        if (isR2Enabled()) {
          saved.publicUrl = r2PublicUrl(bucket, saved.path);
        }
        return reply.code(200).send(saved);
      } catch (error) {
        return reply.code(error.status || 400).send({ message: error.message, statusCode: String(error.statusCode || error.status || 400) });
      }
    },
  });

  app.delete('/storage/v1/object/:bucket', async (request, reply) => {
    const auth = resolveAuth(request);
    if (auth.invalid || !canWrite(auth)) {
      return reply.code(401).send({ message: 'permission denied', statusCode: '403' });
    }
    const prefixes = request.body?.prefixes || [];
    const removed = [];
    try {
      for (const prefix of prefixes) {
        removed.push(await removeObject(request.params.bucket, prefix));
      }
      return reply.send(removed);
    } catch (error) {
      return reply.code(error.status || 400).send({ message: error.message });
    }
  });
}
