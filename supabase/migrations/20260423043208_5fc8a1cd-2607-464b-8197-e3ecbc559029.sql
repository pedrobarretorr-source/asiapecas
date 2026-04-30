ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS customer_id uuid;
CREATE INDEX IF NOT EXISTS idx_prospects_customer_id ON public.prospects(customer_id);