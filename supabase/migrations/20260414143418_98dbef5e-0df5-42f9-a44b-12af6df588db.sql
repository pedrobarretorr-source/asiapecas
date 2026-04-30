-- Pricing settings table
CREATE TABLE public.pricing_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  default_markup numeric NOT NULL DEFAULT 30,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read pricing_settings" ON public.pricing_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert pricing_settings" ON public.pricing_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update pricing_settings" ON public.pricing_settings FOR UPDATE TO authenticated USING (true);

-- Insert default row
INSERT INTO public.pricing_settings (default_markup) VALUES (30);

-- Add sell_price column to sale_items
ALTER TABLE public.sale_items ADD COLUMN sell_price numeric NOT NULL DEFAULT 0;