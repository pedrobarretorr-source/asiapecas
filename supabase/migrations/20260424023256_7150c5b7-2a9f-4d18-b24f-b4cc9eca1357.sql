
-- =========================================
-- 1. ROLES SYSTEM
-- =========================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- 2. VITRINE TABLES
-- =========================================
CREATE TABLE IF NOT EXISTS public.vitrine_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  title text,
  subtitle text,
  cta_label text,
  cta_link text,
  lang text NOT NULL DEFAULT 'pt',
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vitrine_banners ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.vitrine_featured_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id uuid NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  badge_label text,
  badge_color text DEFAULT 'primary',
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vitrine_featured_parts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.vitrine_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vitrine_collections ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.vitrine_collection_parts (
  collection_id uuid NOT NULL REFERENCES public.vitrine_collections(id) ON DELETE CASCADE,
  part_id uuid NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, part_id)
);
ALTER TABLE public.vitrine_collection_parts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.part_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id uuid NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  promo_price numeric NOT NULL,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.part_promotions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.vitrine_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gtm_id text,
  ga4_id text,
  ads_conversion_id text,
  ads_conversion_label text,
  meta_pixel_id text,
  b2b_whatsapp text,
  hero_mode text DEFAULT 'carousel',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.vitrine_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.vitrine_settings (id) 
SELECT gen_random_uuid() WHERE NOT EXISTS (SELECT 1 FROM public.vitrine_settings);

CREATE TABLE IF NOT EXISTS public.b2b_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text,
  cnpj text,
  segment text,
  estimated_volume text,
  phone text,
  email text,
  message text,
  utm jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'novo',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.b2b_leads ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 3. ALTER EXISTING TABLES
-- =========================================
ALTER TABLE public.quote_requests ADD COLUMN IF NOT EXISTS utm jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS image_url text;

-- =========================================
-- 4. RLS POLICIES — public read, admin write
-- =========================================
DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'vitrine_banners','vitrine_featured_parts','vitrine_collections',
    'vitrine_collection_parts','part_promotions','vitrine_settings'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public read %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Public read %1$s" ON public.%1$I FOR SELECT TO public USING (true)', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admins manage %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Admins manage %1$s" ON public.%1$I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin'')) WITH CHECK (public.has_role(auth.uid(), ''admin''))', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Public can insert b2b_leads" ON public.b2b_leads;
CREATE POLICY "Public can insert b2b_leads" ON public.b2b_leads
  FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Admins read b2b_leads" ON public.b2b_leads;
CREATE POLICY "Admins read b2b_leads" ON public.b2b_leads
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update b2b_leads" ON public.b2b_leads;
CREATE POLICY "Admins update b2b_leads" ON public.b2b_leads
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete b2b_leads" ON public.b2b_leads;
CREATE POLICY "Admins delete b2b_leads" ON public.b2b_leads
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- 5. INDEXES
-- =========================================
CREATE INDEX IF NOT EXISTS idx_vitrine_banners_active ON public.vitrine_banners(active, sort_order);
CREATE INDEX IF NOT EXISTS idx_vitrine_featured_active ON public.vitrine_featured_parts(active, sort_order);
CREATE INDEX IF NOT EXISTS idx_vitrine_collections_active ON public.vitrine_collections(active, sort_order);
CREATE INDEX IF NOT EXISTS idx_part_promotions_part ON public.part_promotions(part_id, active);
CREATE INDEX IF NOT EXISTS idx_b2b_leads_created ON public.b2b_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parts_material ON public.parts(material);

-- =========================================
-- 6. UPDATED_AT TRIGGERS
-- =========================================
DROP TRIGGER IF EXISTS trg_vitrine_banners_updated ON public.vitrine_banners;
CREATE TRIGGER trg_vitrine_banners_updated BEFORE UPDATE ON public.vitrine_banners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_vitrine_collections_updated ON public.vitrine_collections;
CREATE TRIGGER trg_vitrine_collections_updated BEFORE UPDATE ON public.vitrine_collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_vitrine_settings_updated ON public.vitrine_settings;
CREATE TRIGGER trg_vitrine_settings_updated BEFORE UPDATE ON public.vitrine_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- 7. STORAGE BUCKET
-- =========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('vitrine', 'vitrine', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read vitrine bucket" ON storage.objects;
CREATE POLICY "Public read vitrine bucket" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'vitrine');

DROP POLICY IF EXISTS "Admins upload vitrine" ON storage.objects;
CREATE POLICY "Admins upload vitrine" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vitrine' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update vitrine" ON storage.objects;
CREATE POLICY "Admins update vitrine" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'vitrine' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete vitrine" ON storage.objects;
CREATE POLICY "Admins delete vitrine" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'vitrine' AND public.has_role(auth.uid(), 'admin'));
