
-- Create parts table
CREATE TABLE public.parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material TEXT NOT NULL,
  description TEXT NOT NULL,
  last_entry_time TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  estimated_price NUMERIC(12,3) NOT NULL DEFAULT 0,
  supplier TEXT,
  manufacturer TEXT,
  machine_model TEXT,
  is_mineracao BOOLEAN NOT NULL DEFAULT false,
  is_linha_amarela BOOLEAN NOT NULL DEFAULT false,
  is_perfuratriz BOOLEAN NOT NULL DEFAULT false,
  is_caminhao_eletrico BOOLEAN NOT NULL DEFAULT false,
  is_guindaste BOOLEAN NOT NULL DEFAULT false,
  compatible_models TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for search and filtering
CREATE INDEX idx_parts_material ON public.parts (material);
CREATE INDEX idx_parts_description ON public.parts USING gin (to_tsvector('portuguese', description));
CREATE INDEX idx_parts_machine_model ON public.parts (machine_model);
CREATE INDEX idx_parts_manufacturer ON public.parts (manufacturer);
CREATE INDEX idx_parts_categories ON public.parts (is_mineracao, is_linha_amarela, is_perfuratriz, is_caminhao_eletrico, is_guindaste);
CREATE INDEX idx_parts_last_entry_time ON public.parts (last_entry_time);

-- Enable RLS
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can read parts" ON public.parts FOR SELECT USING (true);

-- Admin write access
CREATE POLICY "Authenticated users can insert parts" ON public.parts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update parts" ON public.parts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete parts" ON public.parts FOR DELETE TO authenticated USING (true);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_parts_updated_at
  BEFORE UPDATE ON public.parts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
