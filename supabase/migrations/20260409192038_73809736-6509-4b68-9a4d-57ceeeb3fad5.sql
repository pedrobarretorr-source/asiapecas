
-- Create cart_sessions table for guest cart persistence
CREATE TABLE public.cart_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL UNIQUE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cart_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read their cart session"
  ON public.cart_sessions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert cart session"
  ON public.cart_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update cart session"
  ON public.cart_sessions FOR UPDATE
  USING (true);

-- Add converted_sale_id to quote_requests
ALTER TABLE public.quote_requests
  ADD COLUMN converted_sale_id uuid REFERENCES public.sales(id);
