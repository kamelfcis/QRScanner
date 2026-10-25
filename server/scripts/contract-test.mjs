const base = (process.env.API_BASE || 'http://127.0.0.1:3017').replace(/\/$/, '');
const anon = process.env.ANON_KEY;
const service = process.env.SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL || 'mazenstore25@gmail.com';
const password = process.env.ADMIN_PASSWORD;

const catalogSelect = `
id,name_ar,name_en,description_ar,description_en,image_url,banner_url,sort_order,is_visible,created_at,updated_at,
subcategories:subcategories!category_id(id,category_id,name_ar,name_en,description_ar,description_en,image_url,sort_order,is_visible,created_at,updated_at),
products:products!category_id(id,category_id,subcategory_id,name_ar,name_en,description_ar,description_en,image_url,dining_price,takeaway_price,is_available,is_popular,is_new,is_bestseller,is_spicy,sort_order,created_at,updated_at,product_sizes:product_sizes(id,product_id,sort_order,code,label_ar,label_en,price,is_enabled,is_sold_out),gallery:product_gallery(id,product_id,image_url,sort_order,created_at))
`.replace(/\s+/g, '');

const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail || ''}`);
}

async function request(path, { key = anon, token, method = 'GET', body, headers = {} } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      apikey: key,
      authorization: `Bearer ${token || key}`,
      accept: 'application/json',
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: response.status, json, headers: response.headers, text };
}

if (!anon || !service || !password) {
  console.error('ANON_KEY, SERVICE_ROLE_KEY, and ADMIN_PASSWORD are required');
  process.exit(1);
}

const health = await request('/health', { key: anon });
record('health', health.status === 200 && health.json?.ok === true, String(health.status));

const catalogUrl = `/rest/v1/categories?select=${encodeURIComponent(catalogSelect)}&is_visible=eq.true&order=sort_order.asc`;
const catalog = await request(catalogUrl);
const categories = Array.isArray(catalog.json) ? catalog.json : [];
const productCount = categories.reduce((sum, category) => sum + (category.products?.length || 0), 0);
const shapeOk = categories.every(
  (category) => Array.isArray(category.subcategories) && Array.isArray(category.products)
);
const nestedOk = categories.some((category) =>
  (category.products || []).some((product) => Array.isArray(product.product_sizes) && Array.isArray(product.gallery))
);
record(
  'catalog',
  catalog.status === 200 && categories.length === 9 && productCount === 136 && shapeOk && nestedOk,
  `status=${catalog.status} categories=${categories.length} products=${productCount}`
);

const sizes = await request('/rest/v1/product_sizes?select=id', {
  key: service,
  headers: { prefer: 'count=exact', range: '0-0' },
});
const sizeCount = Number((sizes.headers.get('content-range') || '').split('/')[1]);
record('product_sizes', sizes.status === 200 && sizeCount === 55, `count=${sizeCount}`);

const expected = {
  delivery_locations: 27,
  instapay_delivery_proofs: 72,
  settings: 3,
  search_analytics: 1110,
  analytics: 23427,
};
for (const [table, count] of Object.entries(expected)) {
  const response = await request(`/rest/v1/${table}?select=id&limit=1`, {
    key: service,
    headers: { prefer: 'count=exact' },
  });
  const got = Number((response.headers.get('content-range') || '').split('/')[1]);
  record(table, response.status === 200 && got >= count, `count=${got}`);
}

const denied = await request('/rest/v1/products?id=eq.00000000-0000-0000-0000-000000000000', {
  method: 'PATCH',
  body: { name_en: 'nope' },
});
record('anon write denied', denied.status === 401, `status=${denied.status}`);

const login = await request('/auth/v1/token?grant_type=password', {
  method: 'POST',
  body: { email, password },
});
const access = login.json?.access_token;
record('login', login.status === 200 && Boolean(access) && login.json?.user?.email === email, `status=${login.status}`);

const me = await request('/auth/v1/user', { token: access });
record('getUser', me.status === 200 && me.json?.id === login.json?.user?.id, `status=${me.status}`);

const tracked = await request('/rest/v1/rpc/track_analytics_event', {
  method: 'POST',
  body: { p_event_type: 'page_view', p_event_data: { page: 'contract' }, p_device_type: 'desktop' },
});
record('track_analytics_event', tracked.status === 200 && typeof tracked.json === 'string', `status=${tracked.status}`);

const missing = await request('/rest/v1/rpc/place_customer_order', {
  method: 'POST',
  key: service,
  body: { payload: {} },
});
record('missing order rpc', missing.status === 404 && missing.json?.code === 'PGRST202', `status=${missing.status}`);

const search = await request(
  '/rest/v1/products?select=id,name_en,category:categories(id,name_en)&or=(name_en.ilike.%a%,name_ar.ilike.%a%)&limit=5'
);
record('search or embed', search.status === 200 && Array.isArray(search.json), `status=${search.status} rows=${search.json?.length}`);

const popularSelect =
  'id,category_id,subcategory_id,name_ar,name_en,description_ar,description_en,image_url,dining_price,takeaway_price,is_available,is_popular,is_new,is_bestseller,is_spicy,sort_order,created_at,updated_at,gallery:product_gallery(id,product_id,image_url,sort_order)';
const popular = await request(
  `/rest/v1/products?select=${encodeURIComponent(popularSelect)}&is_popular=eq.true&order=sort_order.asc&product_gallery.order=sort_order.asc&limit=12`
);
const popularRows = Array.isArray(popular.json) ? popular.json : [];
const popularOrdered = popularRows.every((row, index) => {
  if (!Array.isArray(row.gallery)) return false;
  if (index > 0 && Number(row.sort_order ?? 0) < Number(popularRows[index - 1].sort_order ?? 0)) return false;
  for (let i = 1; i < row.gallery.length; i += 1) {
    if (Number(row.gallery[i]?.sort_order ?? 0) < Number(row.gallery[i - 1]?.sort_order ?? 0)) return false;
  }
  return true;
});
record(
  'popular products embed order',
  popular.status === 200 && popularRows.length > 0 && popularRows.length <= 12 && popularOrdered,
  `status=${popular.status} rows=${popularRows.length}`
);

const dashboardProductsSelect =
  '*,category:categories(id,name_en,name_ar),product_sizes:product_sizes(id,product_id,sort_order,code,label_ar,label_en,price,is_enabled,is_sold_out)';
const dashboardProducts = await request(
  `/rest/v1/products?select=${encodeURIComponent(dashboardProductsSelect)}&order=sort_order.asc`,
  { token: access }
);
const dashboardRows = Array.isArray(dashboardProducts.json) ? dashboardProducts.json : [];
const dashboardShapeOk =
  dashboardRows.length > 0 &&
  dashboardRows.every(
    (row) =>
      row.category &&
      typeof row.category === 'object' &&
      Array.isArray(row.product_sizes) &&
      'id' in row &&
      'name_en' in row
  );
record(
  'dashboard products select',
  dashboardProducts.status === 200 && dashboardRows.length === 136 && dashboardShapeOk,
  `status=${dashboardProducts.status} rows=${dashboardRows.length}`
);

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);
const upload = await fetch(`${base}/storage/v1/object/products/contract-test.png`, {
  method: 'POST',
  headers: {
    apikey: anon,
    authorization: `Bearer ${access}`,
    'content-type': 'image/png',
    'x-upsert': 'true',
  },
  body: png,
});
const uploadJson = await upload.json().catch(() => null);
const uploaded = await fetch(`${base}/storage/v1/object/public/products/contract-test.png`);
const cdnBase = (process.env.STORAGE_PUBLIC_URL || process.env.R2_PUBLIC_BASE_URL || '').replace(/\/$/, '');
const cdnUrl = cdnBase ? `${cdnBase}/products/contract-test.png` : '';
const cdnStatus = cdnUrl ? (await fetch(cdnUrl)).status : null;
record(
  'storage upload',
  upload.status === 200 && uploadJson?.Key === 'products/contract-test.png' && uploaded.status === 200,
  `upload=${upload.status} public=${uploaded.status}${cdnStatus ? ` cdn=${cdnStatus}` : ''}`
);
if (cdnUrl) {
  record('cdn public url', cdnStatus === 200, cdnUrl.slice(0, 80));
}

const anonUpload = await fetch(`${base}/storage/v1/object/products/anon.png`, {
  method: 'POST',
  headers: { apikey: anon, authorization: `Bearer ${anon}`, 'content-type': 'image/png' },
  body: png,
});
record('anon storage denied', anonUpload.status === 401, `status=${anonUpload.status}`);

const oldHost = await request('/rest/v1/settings?key=eq.restaurant&select=value', { key: service });
const logo = oldHost.json?.[0]?.value?.logo_url || '';
record(
  'rewritten storage url',
  logo.includes('r2.dev/') ||
    logo.startsWith(base) ||
    logo.includes('api.mazen-store.engazqr.com'),
  logo.slice(0, 80)
);

const failed = results.filter((item) => !item.ok);
console.log(JSON.stringify({ passed: results.length - failed.length, failed: failed.length, results }, null, 2));
process.exit(failed.length ? 1 : 0);
