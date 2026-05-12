-- Catalog navigation by machine segment and canonical model
-- Adds machine_segments (storefront segments) + machine_models (canonical models that group
-- the 763 parts.machine_model variants via ILIKE patterns)

CREATE TABLE public.machine_segments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  hero_image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT machine_segments_pkey PRIMARY KEY (id),
  CONSTRAINT machine_segments_slug_key UNIQUE (slug)
);

CREATE TABLE public.machine_models (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  segment_id uuid NOT NULL,
  slug text NOT NULL,
  code text NOT NULL,
  display_name text NOT NULL,
  match_patterns text[] NOT NULL DEFAULT '{}',
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT machine_models_pkey PRIMARY KEY (id),
  CONSTRAINT machine_models_slug_key UNIQUE (slug),
  CONSTRAINT machine_models_segment_id_fkey FOREIGN KEY (segment_id) REFERENCES public.machine_segments(id) ON DELETE CASCADE
);

CREATE INDEX idx_machine_models_segment ON public.machine_models USING btree (segment_id);
CREATE INDEX idx_machine_models_sort ON public.machine_models USING btree (sort_order);

ALTER TABLE public.machine_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read machine_segments" ON public.machine_segments FOR SELECT USING (true);
CREATE POLICY "Public read machine_models" ON public.machine_models FOR SELECT USING (true);
CREATE POLICY "Authenticated insert machine_segments" ON public.machine_segments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update machine_segments" ON public.machine_segments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete machine_segments" ON public.machine_segments FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated insert machine_models" ON public.machine_models FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update machine_models" ON public.machine_models FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete machine_models" ON public.machine_models FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_machine_segments_updated
  BEFORE UPDATE ON public.machine_segments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_machine_models_updated
  BEFORE UPDATE ON public.machine_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC: return parts matching any pattern of the given model slug
CREATE OR REPLACE FUNCTION public.parts_for_model_slug(model_slug_param text)
RETURNS SETOF public.parts
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.*
  FROM public.parts p
  JOIN public.machine_models m ON m.slug = model_slug_param
  WHERE p.machine_model ILIKE ANY (m.match_patterns);
$$;

-- RPC: per-segment summary with model count + parts count for storefront grids
CREATE OR REPLACE FUNCTION public.segment_stats()
RETURNS TABLE (
  slug text,
  name text,
  hero_image_url text,
  sort_order integer,
  model_count bigint,
  parts_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    s.slug, s.name, s.hero_image_url, s.sort_order,
    COUNT(DISTINCT m.id) AS model_count,
    COUNT(DISTINCT p.id) AS parts_count
  FROM public.machine_segments s
  LEFT JOIN public.machine_models m ON m.segment_id = s.id
  LEFT JOIN public.parts p ON p.machine_model ILIKE ANY (m.match_patterns) AND p.stock > 0
  GROUP BY s.id, s.slug, s.name, s.hero_image_url, s.sort_order
  ORDER BY s.sort_order, s.name;
$$;

-- RPC: per-model summary inside a segment
CREATE OR REPLACE FUNCTION public.models_in_segment(segment_slug_param text)
RETURNS TABLE (
  slug text,
  code text,
  display_name text,
  image_url text,
  sort_order integer,
  parts_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    m.slug, m.code, m.display_name, m.image_url, m.sort_order,
    COUNT(DISTINCT p.id) AS parts_count
  FROM public.machine_segments s
  JOIN public.machine_models m ON m.segment_id = s.id
  LEFT JOIN public.parts p ON p.machine_model ILIKE ANY (m.match_patterns) AND p.stock > 0
  WHERE s.slug = segment_slug_param
  GROUP BY m.id, m.slug, m.code, m.display_name, m.image_url, m.sort_order
  ORDER BY m.sort_order, m.code;
$$;
