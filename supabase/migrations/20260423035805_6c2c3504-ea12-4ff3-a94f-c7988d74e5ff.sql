-- Extend customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS interest_models text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS relationship_status text DEFAULT 'prospect',
  ADD COLUMN IF NOT EXISTS last_visit_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_proposal_at timestamptz,
  ADD COLUMN IF NOT EXISTS total_invoiced numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS enrichment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS enriched_at timestamptz,
  ADD COLUMN IF NOT EXISTS enrichment_data jsonb;

-- Helpful indexes for dedup
CREATE INDEX IF NOT EXISTS idx_customers_cnpj_cpf ON public.customers (cnpj_cpf) WHERE cnpj_cpf IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_email_lower ON public.customers (lower(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_enrichment_status ON public.customers (enrichment_status);

-- customer_equipment
CREATE TABLE IF NOT EXISTS public.customer_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  model text,
  serial_number text,
  order_form text,
  delivery_location text,
  purchase_year integer,
  sale_value numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customer_equipment_customer_id ON public.customer_equipment (customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_equipment_serial ON public.customer_equipment (customer_id, serial_number) WHERE serial_number IS NOT NULL;

ALTER TABLE public.customer_equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read customer_equipment" ON public.customer_equipment FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert customer_equipment" ON public.customer_equipment FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update customer_equipment" ON public.customer_equipment FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete customer_equipment" ON public.customer_equipment FOR DELETE TO authenticated USING (true);
CREATE TRIGGER update_customer_equipment_updated_at BEFORE UPDATE ON public.customer_equipment FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- customer_invoices
CREATE TABLE IF NOT EXISTS public.customer_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  document_number text,
  payment_terms text,
  payer_name text,
  invoice_date date,
  total_value numeric NOT NULL DEFAULT 0,
  source text DEFAULT 'sap',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_customer_id ON public.customer_invoices (customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_invoices_doc ON public.customer_invoices (customer_id, document_number) WHERE document_number IS NOT NULL;

ALTER TABLE public.customer_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read customer_invoices" ON public.customer_invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert customer_invoices" ON public.customer_invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update customer_invoices" ON public.customer_invoices FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete customer_invoices" ON public.customer_invoices FOR DELETE TO authenticated USING (true);

-- customer_imports
CREATE TABLE IF NOT EXISTS public.customer_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  total_rows integer NOT NULL DEFAULT 0,
  inserted integer NOT NULL DEFAULT 0,
  updated integer NOT NULL DEFAULT 0,
  skipped integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  report jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read customer_imports" ON public.customer_imports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert customer_imports" ON public.customer_imports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update customer_imports" ON public.customer_imports FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete customer_imports" ON public.customer_imports FOR DELETE TO authenticated USING (true);