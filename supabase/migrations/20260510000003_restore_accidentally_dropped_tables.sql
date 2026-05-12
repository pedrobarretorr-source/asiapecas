-- Restore tables that were dropped but have active frontend code

CREATE TABLE public.b2b_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text,
  cnpj text,
  segment text,
  estimated_volume text,
  phone text,
  email text,
  message text,
  utm jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'novo'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT b2b_leads_pkey PRIMARY KEY (id)
);

CREATE TABLE public.catalog_reports_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  format text NOT NULL,
  scope text,
  filters jsonb DEFAULT '{}'::jsonb,
  row_count integer,
  file_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT catalog_reports_log_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_b2b_leads_created ON public.b2b_leads USING btree (created_at DESC);
CREATE INDEX idx_conversion_events_created_at_2 ON public.catalog_reports_log USING btree (created_at DESC);

ALTER TABLE public.b2b_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_reports_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert b2b_leads" ON public.b2b_leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins read b2b_leads" ON public.b2b_leads FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins update b2b_leads" ON public.b2b_leads FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins delete b2b_leads" ON public.b2b_leads FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users insert own logs" ON public.catalog_reports_log FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users read own logs" ON public.catalog_reports_log FOR SELECT TO authenticated USING ((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role));
