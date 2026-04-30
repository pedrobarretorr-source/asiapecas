-- SEO overrides per category/model slug
CREATE TABLE public.vitrine_seo_overrides (
  slug text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('category','model')),
  title text,
  description text,
  og_image text,
  noindex boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  PRIMARY KEY (slug, kind)
);

ALTER TABLE public.vitrine_seo_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read vitrine_seo_overrides"
  ON public.vitrine_seo_overrides FOR SELECT
  USING (true);

CREATE POLICY "Admins manage vitrine_seo_overrides"
  ON public.vitrine_seo_overrides FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_vitrine_seo_overrides_updated_at
  BEFORE UPDATE ON public.vitrine_seo_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Conversion events log
CREATE TABLE public.conversion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  utm jsonb DEFAULT '{}'::jsonb,
  sent_to_ads boolean NOT NULL DEFAULT false,
  sent_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conversion_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read conversion_events"
  ON public.conversion_events FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_conversion_events_created_at ON public.conversion_events (created_at DESC);
CREATE INDEX idx_conversion_events_event ON public.conversion_events (event);

-- Extend vitrine_settings with per-event ads labels
ALTER TABLE public.vitrine_settings
  ADD COLUMN IF NOT EXISTS ads_label_quote text,
  ADD COLUMN IF NOT EXISTS ads_label_b2b text,
  ADD COLUMN IF NOT EXISTS ads_label_whatsapp text;