-- Drop unused tables (no code references confirmed by audit 2026-05-10)

-- vitrine_collection_parts first (references vitrine_collections)
DROP TABLE IF EXISTS public.vitrine_collection_parts;
DROP TABLE IF EXISTS public.vitrine_collections;

DROP TABLE IF EXISTS public.b2b_leads;
DROP TABLE IF EXISTS public.catalog_reports_log;
DROP TABLE IF EXISTS public.prospection_campaigns;
