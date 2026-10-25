import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  ListBucketsCommand,
} from '@aws-sdk/client-s3';

export function isR2Enabled() {
  return process.env.STORAGE_BACKEND === 'r2';
}

export function r2Config() {
  return {
    endpoint: process.env.R2_ENDPOINT,
    bucket: process.env.R2_BUCKET || 'mazenstore',
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    publicBaseUrl: (process.env.R2_PUBLIC_BASE_URL || '').replace(/\/$/, ''),
  };
}

let client;

function getClient() {
  if (!client) {
    const cfg = r2Config();
    client = new S3Client({
      region: 'auto',
      endpoint: cfg.endpoint,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    });
  }
  return client;
}

export function objectKey(bucket, key) {
  return `${bucket}/${key}`;
}

export function publicUrl(bucket, key) {
  const cfg = r2Config();
  // r2.dev: {base}/{s3-object-key} e.g. .../logos/foo.jpg
  return `${cfg.publicBaseUrl}/${objectKey(bucket, key)}`;
}

export async function listR2Buckets() {
  const response = await getClient().send(new ListBucketsCommand({}));
  return (response.Buckets || []).map((item) => item.Name).filter(Boolean);
}

export async function putObject(bucket, key, buffer, mime) {
  const cfg = r2Config();
  await getClient().send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: objectKey(bucket, key),
      Body: buffer,
      ContentType: mime || 'application/octet-stream',
      CacheControl: 'public, max-age=31536000',
    })
  );
  return { mimetype: mime || 'application/octet-stream', size: buffer.length };
}

export async function getObject(bucket, key) {
  const cfg = r2Config();
  const response = await getClient().send(
    new GetObjectCommand({
      Bucket: cfg.bucket,
      Key: objectKey(bucket, key),
    })
  );
  const buffer = Buffer.from(await response.Body.transformToByteArray());
  return {
    buffer,
    mimetype: response.ContentType || 'application/octet-stream',
  };
}

export async function deleteObject(bucket, key) {
  const cfg = r2Config();
  await getClient().send(
    new DeleteObjectCommand({
      Bucket: cfg.bucket,
      Key: objectKey(bucket, key),
    })
  );
}

export async function listObjects(bucket, body) {
  const cfg = r2Config();
  const prefix = body.prefix ? objectKey(bucket, String(body.prefix).replace(/^\/+|\/+$/g, '')) : `${bucket}/`;
  const normalizedPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;
  const response = await getClient().send(
    new ListObjectsV2Command({
      Bucket: cfg.bucket,
      Prefix: normalizedPrefix,
      MaxKeys: Math.min(Number(body.limit || 100) + Number(body.offset || 0), 1000),
    })
  );
  let files = (response.Contents || [])
    .filter((item) => item.Key && !item.Key.endsWith('/'))
    .map((item) => {
      const name = item.Key.slice(normalizedPrefix.length);
      return {
        name,
        id: name,
        updated_at: item.LastModified?.toISOString() || new Date().toISOString(),
        created_at: item.LastModified?.toISOString() || new Date().toISOString(),
        last_accessed_at: item.LastModified?.toISOString() || new Date().toISOString(),
        metadata: {
          size: item.Size || 0,
          mimetype: 'application/octet-stream',
          created_at: item.LastModified?.toISOString() || new Date().toISOString(),
        },
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
