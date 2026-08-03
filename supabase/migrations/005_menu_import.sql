-- Warda Shamya Digital Restaurant Platform
-- Menu Import System Migration
-- Version: 005
-- Date: 2025-08-03

-- ============================================================
-- IMPORT JOBS
-- ============================================================
CREATE TABLE public.import_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(20) DEFAULT 'uploading',
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(20) NOT NULL,
  file_size INTEGER,
  raw_text TEXT,
  extracted_data JSONB,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT import_jobs_status_check CHECK (
    status IN ('uploading', 'processing', 'parsing', 'preview', 'importing', 'completed', 'failed')
  ),
  CONSTRAINT import_jobs_file_type_check CHECK (
    file_type IN ('pdf', 'png', 'jpeg', 'webp')
  )
);

CREATE INDEX idx_import_jobs_status ON public.import_jobs(status);
CREATE INDEX idx_import_jobs_created ON public.import_jobs(created_at);

-- ============================================================
-- STORAGE BUCKET FOR IMPORTS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('imports', 'imports', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for imports bucket
CREATE POLICY "Admin upload imports"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'imports' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admin read imports"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'imports' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admin delete imports"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'imports' AND auth.uid() IS NOT NULL);

-- ============================================================
-- ENABLE RLS ON IMPORT JOBS
-- ============================================================
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin all import_jobs"
  ON public.import_jobs FOR ALL
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE TRIGGER update_import_jobs_updated_at
  BEFORE UPDATE ON public.import_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
