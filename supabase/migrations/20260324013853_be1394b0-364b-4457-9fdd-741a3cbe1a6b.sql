
CREATE TABLE public.stock_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  source_label text DEFAULT 'Estoque Principal',
  imported_at timestamptz NOT NULL DEFAULT now(),
  total_rows integer DEFAULT 0,
  total_stock integer DEFAULT 0,
  total_value numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'processando',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read stock_imports" ON public.stock_imports FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert stock_imports" ON public.stock_imports FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update stock_imports" ON public.stock_imports FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete stock_imports" ON public.stock_imports FOR DELETE TO public USING (true);

CREATE TABLE public.stock_import_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES public.stock_imports(id) ON DELETE CASCADE,
  material text NOT NULL,
  description text NOT NULL DEFAULT '',
  stock integer DEFAULT 0,
  estimated_price numeric DEFAULT 0,
  machine_model text,
  manufacturer text,
  supplier text,
  last_entry_time text,
  is_mineracao boolean DEFAULT false,
  is_linha_amarela boolean DEFAULT false,
  is_perfuratriz boolean DEFAULT false,
  is_caminhao_eletrico boolean DEFAULT false,
  is_guindaste boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_import_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read stock_import_items" ON public.stock_import_items FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert stock_import_items" ON public.stock_import_items FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update stock_import_items" ON public.stock_import_items FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete stock_import_items" ON public.stock_import_items FOR DELETE TO public USING (true);
