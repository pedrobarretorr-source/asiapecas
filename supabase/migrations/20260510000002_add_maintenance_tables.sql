-- Maintenance tables from old project schema

CREATE TABLE public.maintenance_machines (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category text NOT NULL,
  model text NOT NULL,
  serial text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  image_url text,
  CONSTRAINT maintenance_machines_pkey PRIMARY KEY (id),
  CONSTRAINT maintenance_machines_category_model_key UNIQUE (category, model)
);

CREATE TABLE public.maintenance_plan_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL,
  group_name text NOT NULL DEFAULT 'Geral',
  description text NOT NULL,
  material text NOT NULL,
  substitute_codes text[] NOT NULL DEFAULT '{}',
  quantity integer NOT NULL DEFAULT 1,
  interval_hours integer NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT maintenance_plan_items_pkey PRIMARY KEY (id),
  CONSTRAINT maintenance_plan_items_machine_id_material_interval_hours_key UNIQUE (machine_id, material, interval_hours),
  CONSTRAINT maintenance_plan_items_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.maintenance_machines(id) ON DELETE CASCADE
);

CREATE INDEX idx_maint_machines_category ON public.maintenance_machines USING btree (category);
CREATE INDEX idx_maint_items_machine ON public.maintenance_plan_items USING btree (machine_id);
CREATE INDEX idx_maint_items_material ON public.maintenance_plan_items USING btree (material);
CREATE INDEX idx_maint_items_interval ON public.maintenance_plan_items USING btree (interval_hours);

CREATE TRIGGER trg_maint_machines_updated
  BEFORE UPDATE ON public.maintenance_machines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_maint_items_updated
  BEFORE UPDATE ON public.maintenance_plan_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.maintenance_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read maintenance_machines" ON public.maintenance_machines FOR SELECT USING (true);
CREATE POLICY "Public read maintenance_plan_items" ON public.maintenance_plan_items FOR SELECT USING (true);
CREATE POLICY "Authenticated insert maintenance_machines" ON public.maintenance_machines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update maintenance_machines" ON public.maintenance_machines FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete maintenance_machines" ON public.maintenance_machines FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated insert maintenance_plan_items" ON public.maintenance_plan_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update maintenance_plan_items" ON public.maintenance_plan_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete maintenance_plan_items" ON public.maintenance_plan_items FOR DELETE TO authenticated USING (true);
