"""Build makhboz-020_orders.sql from ala-keefak migrations (VPS-safe, no Supabase Realtime)."""
from __future__ import annotations

import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(__file__).resolve().parent / "makhboz-020_orders.sql"

MIGRATIONS = [
    "019_orders.sql",
    "020_order_staff_acknowledged.sql",
    "021_orders_delete.sql",
    "022_coupons.sql",
    "024_order_delivery_fee.sql",
    "026_place_staff_order.sql",
]

REALTIME_BLOCK = re.compile(
    r"DO \$\$\s*BEGIN\s*IF NOT EXISTS \(\s*SELECT 1\s*FROM pg_publication_tables.*?END\s*\$\$;",
    re.DOTALL | re.IGNORECASE,
)


def git_show(path: str) -> str:
    result = subprocess.run(
        ["git", "show", f"ala-keefak:supabase/migrations/{path}"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout


def strip_realtime(sql: str) -> str:
    return REALTIME_BLOCK.sub("-- (skipped supabase_realtime publication on VPS)", sql)


def main() -> None:
    parts = [
        "-- Makhboz VPS: kitchen order board (from ala-keefak 019-026, adapted)\n",
        "-- Apply: psql -U postgres -d makhboz -v ON_ERROR_STOP=1 -f makhboz-020_orders.sql\n\n",
    ]

    for name in MIGRATIONS:
        parts.append(f"\n-- ===== {name} =====\n")
        parts.append(strip_realtime(git_show(name)))

    parts.append(
        """

-- ===== Makhboz extras =====
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_location_id UUID REFERENCES public.delivery_locations(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS ready_whatsapp_sent_at TIMESTAMPTZ;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS selected_size JSONB;

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_size_check;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_size_check
  CHECK (size_option IS NULL OR size_option IN ('small', 'medium', 'large', 'family'));

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_size_option_check;

-- Enable order board for Makhboz admin dashboard
UPDATE public.settings
SET
  value = COALESCE(value, '{}'::jsonb)
    || jsonb_build_object(
      'dashboard_orders', true,
      'order_prefix', COALESCE(value->>'order_prefix', 'MKB')
    ),
  updated_at = now()
WHERE key = 'features';

INSERT INTO public.settings (key, value)
VALUES ('features', '{"ai_product_images": false, "dashboard_orders": true, "order_prefix": "MKB", "coupons": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;
"""
    )

    OUT.write_text("".join(parts), encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
