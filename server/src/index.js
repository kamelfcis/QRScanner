import path from 'node:path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { loadEnv } from './env.js';
import { resolveAuth, loginWithPassword, refreshSession, userFromAccessToken, updatePassword } from './auth.js';
import { registerRest } from './rest.js';
import { registerStorage } from './storage.js';
import { attachRealtime } from './realtime.js';

loadEnv(path.resolve(process.cwd(), '.env'));

const querystringParser = (raw) => {
  const params = new URLSearchParams(raw);
  const query = {};
  for (const [key, value] of params) {
    if (query[key] === undefined) query[key] = value;
    else if (Array.isArray(query[key])) query[key].push(value);
    else query[key] = [query[key], value];
  }
  return query;
};

const app = Fastify({
  logger: false,
  bodyLimit: 20 * 1024 * 1024,
  routerOptions: { querystringParser },
});

function bufferParser(request, body, done) {
  done(null, body);
}

app.addContentTypeParser(/^image\/.*/, { parseAs: 'buffer' }, bufferParser);
app.addContentTypeParser('application/pdf', { parseAs: 'buffer' }, bufferParser);
app.addContentTypeParser('application/octet-stream', { parseAs: 'buffer' }, bufferParser);

// Supabase clients send Content-Type: application/json on DELETE/GET with no body.
// Fastify's default parser rejects that and the sizes route turns it into a 500.
app.removeContentTypeParser('application/json');
app.addContentTypeParser('application/json', { parseAs: 'string' }, (request, body, done) => {
  const text = typeof body === 'string' ? body : '';
  if (!text.trim()) {
    done(null, null);
    return;
  }
  try {
    done(null, JSON.parse(text));
  } catch (error) {
    error.statusCode = 400;
    done(error, undefined);
  }
});

await app.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
  allowedHeaders: [
    'apikey',
    'authorization',
    'content-type',
    'prefer',
    'accept',
    'x-upsert',
    'x-client-info',
    'x-supabase-api-version',
    'x-retry-count',
    'accept-profile',
    'content-profile',
    'range',
    'cache-control',
    'x-metadata',
  ],
  exposedHeaders: ['content-range', 'content-location', 'location'],
});
await app.register(multipart, { limits: { fileSize: 12 * 1024 * 1024 } });

app.get('/health', async () => ({ ok: true, service: 'mazen-api' }));

app.get('/auth/v1/health', async () => ({ name: 'mazen-auth', version: '1' }));
app.get('/auth/v1/settings', async () => ({
  disable_signup: true,
  mailer_autoconfirm: true,
  phone_autoconfirm: false,
  external: { email: true },
}));

app.post('/auth/v1/token', async (request, reply) => {
  const grant = String(request.query.grant_type || '');
  if (grant === 'password') {
    const session = await loginWithPassword(request.body?.email, request.body?.password);
    if (!session) {
      return reply.code(400).send({ error: 'invalid_grant', error_description: 'Invalid login credentials' });
    }
    return session;
  }
  if (grant === 'refresh_token') {
    const session = await refreshSession(request.body?.refresh_token);
    if (!session) return reply.code(400).send({ error: 'invalid_grant', error_description: 'Invalid refresh token' });
    return session;
  }
  return reply.code(400).send({ error: 'unsupported_grant_type', error_description: grant || 'missing' });
});

app.get('/auth/v1/user', async (request, reply) => {
  const header = request.headers.authorization || '';
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  const user = token ? await userFromAccessToken(token) : null;
  if (!user) return reply.code(401).send({ message: 'invalid claim: missing sub', code: 401 });
  return user;
});

app.put('/auth/v1/user', async (request, reply) => {
  const auth = resolveAuth(request);
  if (auth.role !== 'authenticated' || !auth.sub) {
    return reply.code(401).send({ message: 'invalid claim: missing sub' });
  }
  if (request.body?.password) {
    const user = await updatePassword(auth.sub, request.body.password);
    if (!user) return reply.code(404).send({ message: 'User not found' });
    return user;
  }
  const user = await userFromAccessToken((request.headers.authorization || '').slice(7).trim());
  return user;
});

app.post('/auth/v1/logout', async (_request, reply) => reply.code(204).send());

registerRest(app, { resolveAuth });
registerStorage(app, { resolveAuth });

const port = Number(process.env.PORT || 3017);
const host = process.env.HOST || '127.0.0.1';
await app.listen({ port, host });
attachRealtime(app.server);
console.log(`mazen-api listening on http://${host}:${port}`);
