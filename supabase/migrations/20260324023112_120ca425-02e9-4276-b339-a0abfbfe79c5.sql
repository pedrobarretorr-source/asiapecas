CREATE TABLE public.quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  company text,
  cnpj_cpf text,
  email text,
  phone text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pendente',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert quote_requests" ON public.quote_requests FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can read quote_requests" ON public.quote_requests FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can update quote_requests" ON public.quote_requests FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete quote_requests" ON public.quote_requests FOR DELETE TO public USING (true);