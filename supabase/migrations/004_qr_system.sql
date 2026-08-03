-- Warda Shamya Digital Restaurant Platform
-- QR Code System Migration
-- Version: 004
-- Date: 2025-08-03

-- ============================================================
-- TABLES (restaurant tables for QR association)
-- ============================================================
CREATE TABLE public.restaurant_tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_number INTEGER NOT NULL UNIQUE,
  internal_name VARCHAR(100),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT restaurant_tables_number_check CHECK (table_number > 0)
);

CREATE INDEX idx_restaurant_tables_number ON public.restaurant_tables(table_number);
CREATE INDEX idx_restaurant_tables_active ON public.restaurant_tables(is_active);

-- ============================================================
-- EXTEND QR CODES TABLE
-- ============================================================
ALTER TABLE public.qr_codes
  ADD COLUMN primary_color VARCHAR(7) DEFAULT '#000000',
  ADD COLUMN secondary_color VARCHAR(7) DEFAULT '#B8860B',
  ADD COLUMN rounded_style VARCHAR(20) DEFAULT 'square',
  ADD COLUMN eye_style VARCHAR(20) DEFAULT 'square',
  ADD COLUMN margin INTEGER DEFAULT 4,
  ADD COLUMN error_correction VARCHAR(10) DEFAULT 'M',
  ADD COLUMN table_id UUID REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  ADD COLUMN is_active BOOLEAN DEFAULT true;

CREATE INDEX idx_qr_codes_table ON public.qr_codes(table_id);
CREATE INDEX idx_qr_codes_active ON public.qr_codes(is_active);

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read restaurant_tables"
  ON public.restaurant_tables FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin all restaurant_tables"
  ON public.restaurant_tables FOR ALL
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE TRIGGER update_restaurant_tables_updated_at
  BEFORE UPDATE ON public.restaurant_tables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
