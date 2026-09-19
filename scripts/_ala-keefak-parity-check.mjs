const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN is required');
  process.exit(1);
}
const ref = 'pytmkruoyyhxfktnkpuu';

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${text}`);
  return JSON.parse(text);
}

const mode = process.argv[2] || 'verify';

const REQUIRED_FEATURES = {
  ai_product_images: true,
  dashboard_orders: true,
  coupons: true,
  order_prefix: 'AK',
};

const REQUIRED_RESTAURANT = {
  accepting_orders: true,
  enable_delivery: true,
  whatsapp_on_ready: true,
  auto_print_kitchen_ticket: false,
};

function assertSettings(settingsRows) {
  const byKey = Object.fromEntries(settingsRows.map((row) => [row.key, row.value ?? {}]));
  const features = byKey.features ?? {};
  const restaurant = byKey.restaurant ?? {};
  const errors = [];

  for (const [key, expected] of Object.entries(REQUIRED_FEATURES)) {
    const actual = features[key];
    if (actual !== expected) {
      errors.push(`features.${key}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }

  for (const [key, expected] of Object.entries(REQUIRED_RESTAURANT)) {
    const actual = restaurant[key];
    if (actual !== expected) {
      errors.push(`restaurant.${key}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }

  if (errors.length) {
    throw new Error(`Parity check failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  }

  return { features, restaurant };
}

async function verify() {
  const tables = await sql(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('delivery_locations', 'shift_closes', 'expenses', 'staff_profiles', 'push_subscriptions')
    ORDER BY table_name;
  `);
  const settings = await sql(`
    SELECT key, value FROM public.settings
    WHERE key IN ('restaurant', 'features') ORDER BY key;
  `);
  const staff = await sql(`
    SELECT sp.user_id, sp.role, u.email
    FROM public.staff_profiles sp
    JOIN auth.users u ON u.id = sp.user_id
    WHERE u.email = 'admin@ala-keefak.engazqr.com';
  `);
  const counts = await sql(`
    SELECT (SELECT count(*)::int FROM categories) AS categories_count,
           (SELECT count(*)::int FROM products) AS products_count;
  `);
  const parity = assertSettings(settings);
  return { tables, settings, staff, counts, parity };
}

async function fix() {
  await sql(`
    UPDATE public.settings
    SET value = COALESCE(value, '{}'::jsonb)
      || jsonb_build_object(
        'ai_product_images', true,
        'dashboard_orders', true,
        'coupons', true,
        'order_prefix', 'AK'
      ),
      updated_at = now()
    WHERE key = 'features';
  `);
  await sql(`
    INSERT INTO public.settings (key, value, updated_at)
    SELECT 'features', '{"ai_product_images": true, "dashboard_orders": true, "coupons": true, "order_prefix": "AK"}'::jsonb, now()
    WHERE NOT EXISTS (SELECT 1 FROM public.settings WHERE key = 'features');
  `);
  await sql(`
    UPDATE public.settings
    SET value = COALESCE(value, '{}'::jsonb)
      || jsonb_build_object(
        'accepting_orders', true,
        'enable_delivery', true,
        'whatsapp_on_ready', true,
        'auto_print_kitchen_ticket', false
      ),
      updated_at = now()
    WHERE key = 'restaurant';
  `);
  await sql(`
    INSERT INTO public.settings (key, value, updated_at)
    SELECT 'restaurant', '{"accepting_orders": true, "enable_delivery": true, "whatsapp_on_ready": true, "auto_print_kitchen_ticket": false}'::jsonb, now()
    WHERE NOT EXISTS (SELECT 1 FROM public.settings WHERE key = 'restaurant');
  `);
  const admin = await sql(`
    SELECT id FROM auth.users WHERE email = 'admin@ala-keefak.engazqr.com' LIMIT 1;
  `);
  if (admin.length && !admin[0].id) {
    throw new Error('Admin user lookup failed');
  }
  if (admin.length) {
    await sql(`
      INSERT INTO public.staff_profiles (user_id, role, updated_at)
      VALUES ('${admin[0].id}', 'admin', now())
      ON CONFLICT (user_id) DO UPDATE SET role = 'admin', updated_at = now();
    `);
  }
  return verify();
}

const fn = mode === 'fix' ? fix : verify;
fn()
  .then((result) => console.log(JSON.stringify(result, null, 2)))
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
