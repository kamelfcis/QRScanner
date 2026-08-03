CREATE TABLE public.testimonials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name VARCHAR(200) NOT NULL,
  customer_avatar_url TEXT,
  rating INTEGER NOT NULL DEFAULT 5,
  review_ar TEXT,
  review_en TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT testimonials_rating_check CHECK (rating >= 1 AND rating <= 5)
);

CREATE INDEX idx_testimonials_featured ON public.testimonials(is_featured);
CREATE INDEX idx_testimonials_visible ON public.testimonials(is_visible);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read testimonials" ON public.testimonials FOR SELECT USING (is_visible = true);
CREATE POLICY "Admin all testimonials" ON public.testimonials FOR ALL USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_testimonials_updated_at BEFORE UPDATE ON public.testimonials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
