
-- Fix 1: quote_requests - restrict SELECT to authenticated only
DROP POLICY IF EXISTS "Anyone can read quote_requests" ON public.quote_requests;
CREATE POLICY "Authenticated can read quote_requests" ON public.quote_requests FOR SELECT TO authenticated USING (true);

-- Fix 2: ai_compatibility_results - restrict write operations to authenticated only
DROP POLICY IF EXISTS "Anyone can insert ai_compatibility_results" ON public.ai_compatibility_results;
DROP POLICY IF EXISTS "Anyone can update ai_compatibility_results" ON public.ai_compatibility_results;
DROP POLICY IF EXISTS "Anyone can delete ai_compatibility_results" ON public.ai_compatibility_results;

CREATE POLICY "Authenticated can insert ai_compatibility_results" ON public.ai_compatibility_results FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update ai_compatibility_results" ON public.ai_compatibility_results FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete ai_compatibility_results" ON public.ai_compatibility_results FOR DELETE TO authenticated USING (true);
