ALTER TABLE public.market_research
ADD COLUMN IF NOT EXISTS matched_part_number text,
ADD COLUMN IF NOT EXISTS match_confidence text;