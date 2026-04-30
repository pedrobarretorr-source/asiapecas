
CREATE TABLE IF NOT EXISTS public.ai_compatibility_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id uuid REFERENCES public.parts(id) ON DELETE CASCADE NOT NULL,
  material text NOT NULL,
  compatible_machines text[] DEFAULT '{}',
  technical_description text,
  probable_function text,
  technical_specs text[] DEFAULT '{}',
  maintenance_tips text,
  related_parts text[] DEFAULT '{}',
  researched_at timestamptz NOT NULL DEFAULT now(),
  model_used text DEFAULT 'openai/gpt-5.2',
  UNIQUE(material)
);

ALTER TABLE public.ai_compatibility_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ai_compatibility_results" ON public.ai_compatibility_results FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert ai_compatibility_results" ON public.ai_compatibility_results FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update ai_compatibility_results" ON public.ai_compatibility_results FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete ai_compatibility_results" ON public.ai_compatibility_results FOR DELETE TO public USING (true);
