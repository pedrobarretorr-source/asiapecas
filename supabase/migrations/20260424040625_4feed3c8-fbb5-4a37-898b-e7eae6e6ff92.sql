
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- unaccent é STABLE; precisamos wrapper IMMUTABLE para coluna gerada
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
SET search_path = public
AS $$ SELECT public.unaccent('public.unaccent', $1) $$;

ALTER TABLE public.parts
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', public.immutable_unaccent(coalesce(material,''))), 'A') ||
    setweight(to_tsvector('portuguese', public.immutable_unaccent(coalesce(description,''))), 'B') ||
    setweight(to_tsvector('simple', public.immutable_unaccent(coalesce(manufacturer,''))), 'C') ||
    setweight(to_tsvector('simple', public.immutable_unaccent(coalesce(machine_model,''))), 'C') ||
    setweight(to_tsvector('simple', public.immutable_unaccent(coalesce(subcategory,''))), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_parts_search ON public.parts USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_parts_trgm_desc ON public.parts USING GIN (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_parts_trgm_material ON public.parts USING GIN (material gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_parts_attributes ON public.parts USING GIN (attributes);
CREATE INDEX IF NOT EXISTS idx_parts_manufacturer ON public.parts (manufacturer);
CREATE INDEX IF NOT EXISTS idx_parts_machine_model ON public.parts (machine_model);
CREATE INDEX IF NOT EXISTS idx_parts_part_category ON public.parts (part_category);
CREATE INDEX IF NOT EXISTS idx_parts_last_entry_time ON public.parts (last_entry_time);
