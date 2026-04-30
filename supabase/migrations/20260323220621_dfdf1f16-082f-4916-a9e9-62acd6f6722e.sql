
CREATE TABLE public.prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text,
  cnpj_cpf text,
  email text,
  phone text,
  country text NOT NULL DEFAULT 'BR',
  state text,
  city text,
  segment text DEFAULT 'geral',
  source text NOT NULL DEFAULT 'ia',
  status text NOT NULL DEFAULT 'novo',
  score integer DEFAULT 0,
  matched_parts text[] DEFAULT '{}'::text[],
  notes text,
  ai_summary text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read prospects" ON public.prospects FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert prospects" ON public.prospects FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update prospects" ON public.prospects FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete prospects" ON public.prospects FOR DELETE TO public USING (true);

CREATE TABLE public.prospection_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  target_country text NOT NULL DEFAULT 'BR',
  target_states text[] DEFAULT '{}'::text[],
  target_segments text[] DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'ativa',
  total_prospects integer DEFAULT 0,
  converted integer DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.prospection_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read campaigns" ON public.prospection_campaigns FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert campaigns" ON public.prospection_campaigns FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update campaigns" ON public.prospection_campaigns FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete campaigns" ON public.prospection_campaigns FOR DELETE TO public USING (true);

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS country text DEFAULT 'BR';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

CREATE TRIGGER update_prospects_updated_at BEFORE UPDATE ON public.prospects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
