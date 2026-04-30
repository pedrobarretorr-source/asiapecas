
-- Customers table
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text,
  cnpj_cpf text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  segment text DEFAULT 'geral',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read customers" ON public.customers FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert customers" ON public.customers FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update customers" ON public.customers FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete customers" ON public.customers FOR DELETE TO public USING (true);

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sales table
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  sale_date timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'orcamento',
  total_amount numeric NOT NULL DEFAULT 0,
  payment_method text,
  payment_terms text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read sales" ON public.sales FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert sales" ON public.sales FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update sales" ON public.sales FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete sales" ON public.sales FOR DELETE TO public USING (true);

-- Sale items table
CREATE TABLE public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  part_id uuid REFERENCES public.parts(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read sale_items" ON public.sale_items FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert sale_items" ON public.sale_items FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update sale_items" ON public.sale_items FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete sale_items" ON public.sale_items FOR DELETE TO public USING (true);

-- After sales table
CREATE TABLE public.after_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'suporte',
  status text NOT NULL DEFAULT 'aberto',
  description text NOT NULL,
  resolution text,
  priority text NOT NULL DEFAULT 'media',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.after_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read after_sales" ON public.after_sales FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert after_sales" ON public.after_sales FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update after_sales" ON public.after_sales FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete after_sales" ON public.after_sales FOR DELETE TO public USING (true);
