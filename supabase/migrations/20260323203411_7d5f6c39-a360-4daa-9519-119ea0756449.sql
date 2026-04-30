
CREATE TABLE public.market_research (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id uuid NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  distributor_name text NOT NULL,
  price_found numeric NOT NULL DEFAULT 0,
  delivery_days integer,
  payment_terms text,
  availability text DEFAULT 'em estoque',
  source_url text,
  notes text,
  researched_at timestamptz NOT NULL DEFAULT now(),
  researched_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.market_research ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read market_research" ON public.market_research FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert market_research" ON public.market_research FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update market_research" ON public.market_research FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete market_research" ON public.market_research FOR DELETE TO public USING (true);

CREATE INDEX idx_market_research_part_id ON public.market_research(part_id);
