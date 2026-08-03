-- Search analytics table
CREATE TABLE public.search_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  search_term TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_search_analytics_term ON public.search_analytics(search_term);
CREATE INDEX idx_search_analytics_created ON public.search_analytics(created_at);
CREATE INDEX idx_search_analytics_category ON public.search_analytics(category_id);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created ON public.notifications(created_at);

-- Enable RLS
ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public insert search_analytics" ON public.search_analytics FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin read search_analytics" ON public.search_analytics FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin all notifications" ON public.notifications FOR ALL USING (auth.uid() IS NOT NULL);

-- Performance indexes for analytics queries
CREATE INDEX idx_analytics_event_data ON public.analytics USING gin(event_data);
CREATE INDEX idx_analytics_created_type ON public.analytics(created_at, event_type);
CREATE INDEX idx_analytics_device_type ON public.analytics(device_type);
