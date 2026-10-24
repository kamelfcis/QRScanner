-- Generated from Mazen schema.sql. Public catalog only.

CREATE TABLE "public"."analytics" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "event_type" character varying(50) NOT NULL,
  "event_data" jsonb,
  "ip_address" inet,
  "user_agent" text,
  "country" character varying(2),
  "city" character varying(100),
  "device_type" character varying(20),
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "analytics_pkey" PRIMARY KEY (id)
);

CREATE TABLE "public"."categories" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "name_ar" character varying(255) NOT NULL,
  "name_en" character varying(255) NOT NULL,
  "description_ar" text,
  "description_en" text,
  "image_url" text,
  "banner_url" text,
  "sort_order" integer DEFAULT 0,
  "is_visible" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "categories_pkey" PRIMARY KEY (id)
);

CREATE TABLE "public"."delivery_locations" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "name_ar" character varying(255) NOT NULL,
  "name_en" character varying(255) NOT NULL,
  "name_fr" character varying(255),
  "name_nl" character varying(255),
  "delivery_fee" numeric(10,2) DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "delivery_locations_delivery_fee_check" CHECK (delivery_fee >= 0::numeric),
  CONSTRAINT "delivery_locations_pkey" PRIMARY KEY (id)
);

CREATE TABLE "public"."gallery" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "image_url" text NOT NULL,
  "caption_ar" character varying(500),
  "caption_en" character varying(500),
  "sort_order" integer DEFAULT 0,
  "is_visible" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "gallery_pkey" PRIMARY KEY (id)
);

CREATE TABLE "public"."import_jobs" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "status" character varying(20) DEFAULT 'uploading'::character varying,
  "file_name" text NOT NULL,
  "file_url" text NOT NULL,
  "file_type" character varying(20) NOT NULL,
  "file_size" integer,
  "raw_text" text,
  "extracted_data" jsonb,
  "error_message" text,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "import_jobs_file_type_check" CHECK (file_type::text = ANY (ARRAY['pdf'::character varying, 'png'::character varying, 'jpeg'::character varying, 'webp'::character varying]::text[])),
  CONSTRAINT "import_jobs_status_check" CHECK (status::text = ANY (ARRAY['uploading'::character varying, 'processing'::character varying, 'parsing'::character varying, 'preview'::character varying, 'importing'::character varying, 'completed'::character varying, 'failed'::character varying]::text[])),
  CONSTRAINT "import_jobs_pkey" PRIMARY KEY (id)
);

CREATE TABLE "public"."instapay_delivery_proofs" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "order_ref" character varying(32) NOT NULL,
  "customer_name" character varying(255) DEFAULT ''::character varying NOT NULL,
  "customer_phone" character varying(50),
  "delivery_location_id" uuid,
  "delivery_fee" numeric(10,2) DEFAULT 0 NOT NULL,
  "proof_reference" character varying(255),
  "screenshot_url" text,
  "amount_note" character varying(255),
  "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
  "whatsapp_sent_at" timestamp with time zone,
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "instapay_delivery_proofs_status_check" CHECK (status::text = ANY (ARRAY['pending'::character varying, 'confirmed'::character varying, 'rejected'::character varying]::text[])),
  CONSTRAINT "instapay_delivery_proofs_pkey" PRIMARY KEY (id),
  CONSTRAINT "instapay_delivery_proofs_order_ref_key" UNIQUE (order_ref)
);

CREATE TABLE "public"."notifications" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "type" character varying(50) NOT NULL,
  "title" text NOT NULL,
  "message" text,
  "data" jsonb,
  "is_read" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "notifications_pkey" PRIMARY KEY (id)
);

CREATE TABLE "public"."offers" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "title_ar" character varying(255) NOT NULL,
  "title_en" character varying(255) NOT NULL,
  "description_ar" text,
  "description_en" text,
  "image_url" text,
  "discount_type" character varying(20) DEFAULT 'percentage'::character varying,
  "discount_value" numeric(10,2) NOT NULL,
  "start_date" timestamp with time zone,
  "end_date" timestamp with time zone,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "offers_discount_type_check" CHECK (discount_type::text = ANY (ARRAY['percentage'::character varying, 'fixed'::character varying]::text[])),
  CONSTRAINT "offers_discount_value_check" CHECK (discount_value >= 0::numeric),
  CONSTRAINT "offers_pkey" PRIMARY KEY (id)
);

CREATE TABLE "public"."product_gallery" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "product_id" uuid NOT NULL,
  "image_url" text NOT NULL,
  "sort_order" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "product_gallery_pkey" PRIMARY KEY (id)
);

CREATE TABLE "public"."product_sizes" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "product_id" uuid NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "code" character varying(32) NOT NULL,
  "label_ar" character varying(255) NOT NULL,
  "label_en" character varying(255) NOT NULL,
  "price" numeric(10,2) NOT NULL,
  "is_enabled" boolean DEFAULT false NOT NULL,
  "is_sold_out" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "product_sizes_price_check" CHECK (price >= 0::numeric),
  CONSTRAINT "product_sizes_pkey" PRIMARY KEY (id),
  CONSTRAINT "product_sizes_code_unique" UNIQUE (product_id, code)
);

CREATE TABLE "public"."products" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "category_id" uuid NOT NULL,
  "subcategory_id" uuid,
  "name_ar" character varying(255) NOT NULL,
  "name_en" character varying(255) NOT NULL,
  "description_ar" text,
  "description_en" text,
  "image_url" text,
  "dining_price" numeric(10,2) NOT NULL,
  "takeaway_price" numeric(10,2) NOT NULL,
  "is_available" boolean DEFAULT true,
  "is_popular" boolean DEFAULT false,
  "is_new" boolean DEFAULT false,
  "is_bestseller" boolean DEFAULT false,
  "is_spicy" boolean DEFAULT false,
  "sort_order" integer DEFAULT 0,
  "stock_qty" integer,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "products_dining_price_check" CHECK (dining_price >= 0::numeric),
  CONSTRAINT "products_takeaway_price_check" CHECK (takeaway_price >= 0::numeric),
  CONSTRAINT "products_stock_qty_check" CHECK (stock_qty IS NULL OR stock_qty >= 0),
  CONSTRAINT "products_pkey" PRIMARY KEY (id)
);

CREATE TABLE "public"."qr_codes" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "name" character varying(255) NOT NULL,
  "url" text NOT NULL,
  "foreground_color" character varying(7) DEFAULT '#000000'::character varying,
  "background_color" character varying(7) DEFAULT '#FFFFFF'::character varying,
  "logo_url" text,
  "template" character varying(50) DEFAULT 'default'::character varying,
  "size" integer DEFAULT 300,
  "image_url" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "primary_color" character varying(7) DEFAULT '#000000'::character varying,
  "secondary_color" character varying(7) DEFAULT '#B8860B'::character varying,
  "rounded_style" character varying(20) DEFAULT 'square'::character varying,
  "eye_style" character varying(20) DEFAULT 'square'::character varying,
  "margin" integer DEFAULT 4,
  "error_correction" character varying(10) DEFAULT 'M'::character varying,
  "table_id" uuid,
  "is_active" boolean DEFAULT true,
  CONSTRAINT "qr_codes_size_check" CHECK (size >= 100 AND size <= 1000),
  CONSTRAINT "qr_codes_pkey" PRIMARY KEY (id)
);

CREATE TABLE "public"."restaurant_tables" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "table_number" integer NOT NULL,
  "internal_name" character varying(100),
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "restaurant_tables_number_check" CHECK (table_number > 0),
  CONSTRAINT "restaurant_tables_pkey" PRIMARY KEY (id),
  CONSTRAINT "restaurant_tables_table_number_key" UNIQUE (table_number)
);

CREATE TABLE "public"."search_analytics" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "search_term" text NOT NULL,
  "results_count" integer DEFAULT 0,
  "category_id" uuid,
  "user_agent" text,
  "ip_address" inet,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "search_analytics_pkey" PRIMARY KEY (id)
);

CREATE TABLE "public"."settings" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "key" character varying(100) NOT NULL,
  "value" jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "settings_pkey" PRIMARY KEY (id),
  CONSTRAINT "settings_key_key" UNIQUE (key)
);

CREATE TABLE "public"."subcategories" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "category_id" uuid NOT NULL,
  "name_ar" character varying(255) NOT NULL,
  "name_en" character varying(255) NOT NULL,
  "description_ar" text,
  "description_en" text,
  "image_url" text,
  "sort_order" integer DEFAULT 0,
  "is_visible" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "subcategories_pkey" PRIMARY KEY (id)
);

CREATE TABLE "public"."testimonials" (
  "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
  "customer_name" character varying(200) NOT NULL,
  "customer_avatar_url" text,
  "rating" integer DEFAULT 5 NOT NULL,
  "review_ar" text,
  "review_en" text,
  "is_featured" boolean DEFAULT false,
  "is_visible" boolean DEFAULT true,
  "sort_order" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "testimonials_rating_check" CHECK (rating >= 1 AND rating <= 5),
  CONSTRAINT "testimonials_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."import_jobs" ADD CONSTRAINT "import_jobs_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE "public"."instapay_delivery_proofs" ADD CONSTRAINT "instapay_delivery_proofs_delivery_location_id_fkey" FOREIGN KEY (delivery_location_id) REFERENCES public.delivery_locations(id);

ALTER TABLE "public"."product_gallery" ADD CONSTRAINT "product_gallery_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE "public"."product_sizes" ADD CONSTRAINT "product_sizes_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE "public"."products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;

ALTER TABLE "public"."products" ADD CONSTRAINT "products_subcategory_id_fkey" FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id) ON DELETE SET NULL;

ALTER TABLE "public"."qr_codes" ADD CONSTRAINT "qr_codes_table_id_fkey" FOREIGN KEY (table_id) REFERENCES public.restaurant_tables(id) ON DELETE SET NULL;

ALTER TABLE "public"."search_analytics" ADD CONSTRAINT "search_analytics_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE "public"."subcategories" ADD CONSTRAINT "subcategories_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;

CREATE INDEX idx_analytics_created ON public.analytics USING btree (created_at);

CREATE INDEX idx_analytics_created_type ON public.analytics USING btree (created_at, event_type);

CREATE INDEX idx_analytics_device_type ON public.analytics USING btree (device_type);

CREATE INDEX idx_analytics_event_data ON public.analytics USING gin (event_data);

CREATE INDEX idx_analytics_type ON public.analytics USING btree (event_type);

CREATE INDEX idx_categories_sort ON public.categories USING btree (sort_order);

CREATE INDEX idx_categories_visible ON public.categories USING btree (is_visible);

CREATE INDEX idx_delivery_locations_active_sort ON public.delivery_locations USING btree (is_active, sort_order);

CREATE INDEX idx_gallery_sort ON public.gallery USING btree (sort_order);

CREATE INDEX idx_gallery_visible ON public.gallery USING btree (is_visible);

CREATE INDEX idx_import_jobs_created ON public.import_jobs USING btree (created_at);

CREATE INDEX idx_import_jobs_status ON public.import_jobs USING btree (status);

CREATE INDEX idx_instapay_delivery_proofs_status_created ON public.instapay_delivery_proofs USING btree (status, created_at DESC);

CREATE UNIQUE INDEX idx_instapay_proof_reference_unique ON public.instapay_delivery_proofs USING btree (upper((proof_reference)::text)) WHERE ((proof_reference IS NOT NULL) AND ((status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying])::text[])));

CREATE INDEX idx_notifications_created ON public.notifications USING btree (created_at);

CREATE INDEX idx_notifications_read ON public.notifications USING btree (is_read);

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);

CREATE INDEX idx_offers_active ON public.offers USING btree (is_active);

CREATE INDEX idx_offers_dates ON public.offers USING btree (start_date, end_date);

CREATE INDEX idx_product_gallery_product ON public.product_gallery USING btree (product_id);

CREATE INDEX idx_product_sizes_product_sort ON public.product_sizes USING btree (product_id, sort_order);

CREATE INDEX idx_products_available ON public.products USING btree (is_available);

CREATE INDEX idx_products_category ON public.products USING btree (category_id);

CREATE INDEX idx_products_popular ON public.products USING btree (is_popular);

CREATE INDEX idx_products_sort ON public.products USING btree (sort_order);

CREATE INDEX idx_products_subcategory ON public.products USING btree (subcategory_id);

CREATE INDEX idx_qr_codes_active ON public.qr_codes USING btree (is_active);

CREATE INDEX idx_qr_codes_table ON public.qr_codes USING btree (table_id);

CREATE INDEX idx_restaurant_tables_active ON public.restaurant_tables USING btree (is_active);

CREATE INDEX idx_restaurant_tables_number ON public.restaurant_tables USING btree (table_number);

CREATE INDEX idx_search_analytics_category ON public.search_analytics USING btree (category_id);

CREATE INDEX idx_search_analytics_created ON public.search_analytics USING btree (created_at);

CREATE INDEX idx_search_analytics_term ON public.search_analytics USING btree (search_term);

CREATE INDEX idx_subcategories_category ON public.subcategories USING btree (category_id);

CREATE INDEX idx_subcategories_sort ON public.subcategories USING btree (sort_order);

CREATE INDEX idx_testimonials_featured ON public.testimonials USING btree (is_featured);

CREATE INDEX idx_testimonials_visible ON public.testimonials USING btree (is_visible);

CREATE OR REPLACE FUNCTION public.track_analytics_event(p_event_type text, p_event_data jsonb DEFAULT '{}'::jsonb, p_user_agent text DEFAULT NULL::text, p_device_type text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id UUID;
  v_allowed TEXT[] := ARRAY[
    'page_view', 'product_view', 'category_view', 'qr_scan',
    'dining_order', 'takeaway_order', 'search', 'offer_click', 'favorite_toggle',
    'add_to_cart', 'cart_open', 'checkout_start', 'order_whatsapp'
  ];
BEGIN
  IF p_event_type IS NULL OR NOT (p_event_type = ANY (v_allowed)) THEN
    RAISE EXCEPTION 'Invalid event type';
  END IF;

  IF p_event_data IS NOT NULL AND octet_length(p_event_data::text) > 4096 THEN
    RAISE EXCEPTION 'Event data too large';
  END IF;

  IF p_user_agent IS NOT NULL AND length(p_user_agent) > 512 THEN
    p_user_agent := left(p_user_agent, 512);
  END IF;

  INSERT INTO public.analytics (event_type, event_data, user_agent, device_type)
  VALUES (
    p_event_type,
    COALESCE(p_event_data, '{}'::jsonb),
    p_user_agent,
    CASE
      WHEN p_device_type IN ('mobile', 'tablet', 'desktop', 'unknown') THEN p_device_type
      ELSE 'unknown'
    END
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.track_search_event(p_search_term text, p_results_count integer DEFAULT 0, p_category_id uuid DEFAULT NULL::uuid, p_user_agent text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id UUID;
BEGIN
  IF p_search_term IS NULL OR length(trim(p_search_term)) = 0 THEN
    RAISE EXCEPTION 'Search term required';
  END IF;

  IF length(p_search_term) > 200 THEN
    p_search_term := left(p_search_term, 200);
  END IF;

  IF p_user_agent IS NOT NULL AND length(p_user_agent) > 512 THEN
    p_user_agent := left(p_user_agent, 512);
  END IF;

  INSERT INTO public.search_analytics (search_term, results_count, category_id, user_agent)
  VALUES (
    trim(p_search_term),
    GREATEST(COALESCE(p_results_count, 0), 0),
    p_category_id,
    p_user_agent
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_delivery_locations_updated_at BEFORE UPDATE ON public.delivery_locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_import_jobs_updated_at BEFORE UPDATE ON public.import_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_sizes_updated_at BEFORE UPDATE ON public.product_sizes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_qr_codes_updated_at BEFORE UPDATE ON public.qr_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_restaurant_tables_updated_at BEFORE UPDATE ON public.restaurant_tables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subcategories_updated_at BEFORE UPDATE ON public.subcategories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_testimonials_updated_at BEFORE UPDATE ON public.testimonials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE "public"."analytics" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."delivery_locations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."gallery" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."import_jobs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."instapay_delivery_proofs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."offers" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."product_gallery" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."product_sizes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."qr_codes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."restaurant_tables" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."search_analytics" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."subcategories" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."testimonials" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read analytics" ON "public"."analytics" AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Public insert analytics" ON "public"."analytics" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Admin all categories" ON "public"."categories" AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Public read categories" ON "public"."categories" AS PERMISSIVE FOR SELECT TO public USING ((is_visible = true));

CREATE POLICY "Public read active delivery_locations" ON "public"."delivery_locations" AS PERMISSIVE FOR SELECT TO public USING ((is_active = true));

CREATE POLICY "Staff delete delivery_locations" ON "public"."delivery_locations" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((( SELECT auth.uid() AS uid) IS NOT NULL));

CREATE POLICY "Staff insert delivery_locations" ON "public"."delivery_locations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((( SELECT auth.uid() AS uid) IS NOT NULL));

CREATE POLICY "Staff select delivery_locations" ON "public"."delivery_locations" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT auth.uid() AS uid) IS NOT NULL));

CREATE POLICY "Staff update delivery_locations" ON "public"."delivery_locations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((( SELECT auth.uid() AS uid) IS NOT NULL)) WITH CHECK ((( SELECT auth.uid() AS uid) IS NOT NULL));

CREATE POLICY "Admin all gallery" ON "public"."gallery" AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Public read gallery" ON "public"."gallery" AS PERMISSIVE FOR SELECT TO public USING ((is_visible = true));

CREATE POLICY "Admin all import_jobs" ON "public"."import_jobs" AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Staff select instapay_delivery_proofs" ON "public"."instapay_delivery_proofs" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT auth.uid() AS uid) IS NOT NULL));

CREATE POLICY "Staff update instapay_delivery_proofs" ON "public"."instapay_delivery_proofs" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((( SELECT auth.uid() AS uid) IS NOT NULL)) WITH CHECK ((( SELECT auth.uid() AS uid) IS NOT NULL));

CREATE POLICY "Admin all notifications" ON "public"."notifications" AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Admin all offers" ON "public"."offers" AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Public read offers" ON "public"."offers" AS PERMISSIVE FOR SELECT TO public USING (((is_active = true) AND ((start_date IS NULL) OR (start_date <= now())) AND ((end_date IS NULL) OR (end_date >= now()))));

CREATE POLICY "Admin all product_gallery" ON "public"."product_gallery" AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Public read product_gallery" ON "public"."product_gallery" AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Public read enabled product_sizes" ON "public"."product_sizes" AS PERMISSIVE FOR SELECT TO public USING ((is_enabled = true));

CREATE POLICY "Staff all product_sizes" ON "public"."product_sizes" AS PERMISSIVE FOR ALL TO public USING ((( SELECT auth.uid() AS uid) IS NOT NULL));

CREATE POLICY "Admin all products" ON "public"."products" AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Public read products" ON "public"."products" AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Admin all qr_codes" ON "public"."qr_codes" AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Admin all restaurant_tables" ON "public"."restaurant_tables" AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Public read restaurant_tables" ON "public"."restaurant_tables" AS PERMISSIVE FOR SELECT TO public USING ((is_active = true));

CREATE POLICY "Admin read search_analytics" ON "public"."search_analytics" AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Public insert search_analytics" ON "public"."search_analytics" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Admin all settings" ON "public"."settings" AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Public read settings" ON "public"."settings" AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Admin all subcategories" ON "public"."subcategories" AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Public read subcategories" ON "public"."subcategories" AS PERMISSIVE FOR SELECT TO public USING ((is_visible = true));

CREATE POLICY "Admin all testimonials" ON "public"."testimonials" AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Public read testimonials" ON "public"."testimonials" AS PERMISSIVE FOR SELECT TO public USING ((is_visible = true));

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
