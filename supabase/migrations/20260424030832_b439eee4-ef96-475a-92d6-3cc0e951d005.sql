
-- 1) Colunas em parts
ALTER TABLE public.parts
  ADD COLUMN IF NOT EXISTS subcategory text,
  ADD COLUMN IF NOT EXISTS attributes jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS subcategory_source text,
  ADD COLUMN IF NOT EXISTS subcategory_confidence numeric;

CREATE INDEX IF NOT EXISTS idx_parts_subcategory ON public.parts (subcategory);
CREATE INDEX IF NOT EXISTS idx_parts_attributes_gin ON public.parts USING gin (attributes);

-- 2) Função de classificação por regras
CREATE OR REPLACE FUNCTION public.apply_subcategory_rules(_only_missing boolean DEFAULT true)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  r RECORD;
  v_text text;
  v_sub text;
  v_attrs jsonb;
  v_match text;
BEGIN
  FOR r IN
    SELECT id, description, material
    FROM public.parts p
    WHERE (NOT _only_missing) OR p.subcategory IS NULL OR p.subcategory = ''
  LOOP
    v_text := lower(coalesce(r.description,'') || ' ' || coalesce(r.material,''));
    v_sub := NULL;
    v_attrs := '{}'::jsonb;

    -- Ordem importa: regras mais específicas primeiro
    IF v_text ~ '(pneu|tire|tyre|llanta|neumatico)' THEN
      v_sub := 'Pneus';
      v_match := (regexp_match(v_text, '(\d{2}\.?\d?[r-]\d{2,3})'))[1];
      IF v_match IS NOT NULL THEN v_attrs := v_attrs || jsonb_build_object('medida', upper(v_match)); END IF;
      IF v_text ~ '\me[345]\M' THEN v_attrs := v_attrs || jsonb_build_object('padrao', upper((regexp_match(v_text, '\m(e[345])\M'))[1])); END IF;
      IF v_text ~ '\ml[345]\M' THEN v_attrs := v_attrs || jsonb_build_object('padrao', upper((regexp_match(v_text, '\m(l[345])\M'))[1])); END IF;

    ELSIF v_text ~ '(farol|headlight|faro\s|head\s?lamp|luz\s?de\s?trabalho|work\s?light)' THEN
      v_sub := 'Faróis e Iluminação';
      IF v_text ~ '\mled\M' THEN v_attrs := v_attrs || jsonb_build_object('tipo','LED'); 
      ELSIF v_text ~ '(halog|halogen)' THEN v_attrs := v_attrs || jsonb_build_object('tipo','Halógeno'); END IF;
      IF v_text ~ '(diant|front|delant)' THEN v_attrs := v_attrs || jsonb_build_object('posicao','Dianteiro');
      ELSIF v_text ~ '(tras|rear|tras)' THEN v_attrs := v_attrs || jsonb_build_object('posicao','Traseiro');
      ELSIF v_text ~ '(trabalho|work)' THEN v_attrs := v_attrs || jsonb_build_object('posicao','Trabalho'); END IF;

    ELSIF v_text ~ '(filtro|filter|filtre)' THEN
      v_sub := 'Filtros';
      IF v_text ~ '(óleo|oleo|oil|aceite)' THEN v_attrs := v_attrs || jsonb_build_object('fluido','Óleo');
      ELSIF v_text ~ '(\mar\M|air|aire)' THEN v_attrs := v_attrs || jsonb_build_object('fluido','Ar');
      ELSIF v_text ~ '(combust|fuel|diesel|gasolina)' THEN v_attrs := v_attrs || jsonb_build_object('fluido','Combustível');
      ELSIF v_text ~ '(hidr|hydraulic)' THEN v_attrs := v_attrs || jsonb_build_object('fluido','Hidráulico');
      ELSIF v_text ~ '(cabine|cabin)' THEN v_attrs := v_attrs || jsonb_build_object('fluido','Cabine');
      ELSIF v_text ~ '(separador|water|agua)' THEN v_attrs := v_attrs || jsonb_build_object('fluido','Separador de água'); END IF;

    ELSIF v_text ~ '(mangueira|hose|manguera|tubo flex)' THEN
      v_sub := 'Mangueiras e Tubos';
      v_match := (regexp_match(v_text, '(\d+\s?(mm|cm|m|pol|"))'))[1];
      IF v_match IS NOT NULL THEN v_attrs := v_attrs || jsonb_build_object('medida', v_match); END IF;

    ELSIF v_text ~ '(rolamento|bearing|cojinete|rodamiento)' THEN
      v_sub := 'Rolamentos';
      v_match := (regexp_match(v_text, '\m(\d{4,6})\M'))[1];
      IF v_match IS NOT NULL THEN v_attrs := v_attrs || jsonb_build_object('codigo', v_match); END IF;

    ELSIF v_text ~ '(cilindro\s?hidr|hydraulic\s?cyl|cilindro\s?hydra)' THEN
      v_sub := 'Cilindros Hidráulicos';

    ELSIF v_text ~ '(bomba|pump|bomba\s?hidr)' THEN
      v_sub := 'Bombas';
      IF v_text ~ '(hidr|hydra)' THEN v_attrs := v_attrs || jsonb_build_object('tipo','Hidráulica');
      ELSIF v_text ~ '(óleo|oleo|oil)' THEN v_attrs := v_attrs || jsonb_build_object('tipo','Óleo');
      ELSIF v_text ~ '(combust|fuel)' THEN v_attrs := v_attrs || jsonb_build_object('tipo','Combustível');
      ELSIF v_text ~ '(\magua\M|water)' THEN v_attrs := v_attrs || jsonb_build_object('tipo','Água'); END IF;

    ELSIF v_text ~ '(correia|belt|correa)' THEN
      v_sub := 'Correias';

    ELSIF v_text ~ '(vedação|vedacao|seal|reten|o-?ring|junta|gasket|empaque)' THEN
      v_sub := 'Vedações e Retentores';

    ELSIF v_text ~ '(parafuso|bolt|tornillo|porca|\mnut\M|arruela|washer|prisioneiro|screw)' THEN
      v_sub := 'Fixadores';

    ELSIF v_text ~ '(lâmina|lamina|blade|cuchilla|dente\s?(de\s?)?caçamba|tooth|caçamba|cacamba|bucket)' THEN
      v_sub := 'Implementos de Solo';

    ELSIF v_text ~ '(bateria|battery|bateria\s?12v|bateria\s?24v)' THEN
      v_sub := 'Baterias';
      IF v_text ~ '24\s?v' THEN v_attrs := v_attrs || jsonb_build_object('tensao','24V');
      ELSIF v_text ~ '12\s?v' THEN v_attrs := v_attrs || jsonb_build_object('tensao','12V'); END IF;

    ELSIF v_text ~ '(radiador|radiator|intercooler|trocador\s?de\s?calor)' THEN
      v_sub := 'Radiadores e Arrefecimento';

    ELSIF v_text ~ '(alternador|alternator)' THEN
      v_sub := 'Alternadores';

    ELSIF v_text ~ '(motor\s?de\s?partida|starter|arranque)' THEN
      v_sub := 'Motor de Partida';

    ELSIF v_text ~ '(injetor|injector|bico\s?injet)' THEN
      v_sub := 'Injetores e Bicos';

    ELSIF v_text ~ '(turbo|turbina|turbocharger)' THEN
      v_sub := 'Turbinas';

    ELSIF v_text ~ '(válvula|valvula|valve)' THEN
      v_sub := 'Válvulas';

    ELSIF v_text ~ '(sensor|sender|sonda)' THEN
      v_sub := 'Sensores';

    ELSIF v_text ~ '(chicote|harness|cable\s?asse)' THEN
      v_sub := 'Chicotes Elétricos';

    ELSIF v_text ~ '(disco|pastilha|lona|pad|brake|freio|clutch|embreagem)' THEN
      v_sub := 'Freios e Embreagem';

    ELSIF v_text ~ '(amortecedor|shock\s?abs|absorber)' THEN
      v_sub := 'Amortecedores';

    ELSIF v_text ~ '(rolete|roller|esteira|track|sprocket|coroa\s?de\s?esteira)' THEN
      v_sub := 'Material Rodante';

    ELSIF v_text ~ '(engrenagem|gear|planet|engranaje)' THEN
      v_sub := 'Engrenagens';

    ELSIF v_text ~ '(eixo|shaft|cardan|semi.?eixo|axle)' THEN
      v_sub := 'Eixos e Cardans';

    ELSIF v_text ~ '(cabine|cabin|vidro|glass|para.?brisa|porta\s?cabine)' THEN
      v_sub := 'Cabine e Vidros';

    ELSIF v_text ~ '(banco|seat|assento)' THEN
      v_sub := 'Bancos';

    ELSIF v_text ~ '(retrovisor|mirror|espelho)' THEN
      v_sub := 'Retrovisores';

    ELSIF v_text ~ '(filtro\s?de\s?cabine|ar\s?condic|hvac|ventil|blower)' THEN
      v_sub := 'Ar Condicionado';

    ELSIF v_text ~ '(óleo|oleo|lubrif|grease|graxa|fluido)' THEN
      v_sub := 'Lubrificantes e Fluidos';

    ELSIF v_text ~ '(decal|adesivo|sticker|emblema|plaqueta)' THEN
      v_sub := 'Adesivos e Plaquetas';

    ELSIF v_text ~ '(kit|reparo|repair)' THEN
      v_sub := 'Kits de Reparo';
    END IF;

    IF v_sub IS NOT NULL THEN
      UPDATE public.parts
        SET subcategory = v_sub,
            attributes = COALESCE(attributes,'{}'::jsonb) || v_attrs,
            subcategory_source = 'rule',
            subcategory_confidence = 0.85
      WHERE id = r.id;
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 3) Função de inteligência agregada
CREATE OR REPLACE FUNCTION public.get_catalog_intelligence()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    'generatedAt', now(),
    'overall', json_build_object(
      'totalSkus', (SELECT count(*) FROM parts),
      'totalUnits', (SELECT coalesce(sum(stock),0) FROM parts),
      'totalValue', (SELECT coalesce(sum(stock::numeric * estimated_price),0) FROM parts),
      'classifiedSkus', (SELECT count(*) FROM parts WHERE subcategory IS NOT NULL),
      'unclassifiedSkus', (SELECT count(*) FROM parts WHERE subcategory IS NULL)
    ),
    'bySubcategory', (
      SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.value DESC), '[]'::json) FROM (
        SELECT
          coalesce(subcategory,'(não classificado)') as subcategory,
          count(*) as skus,
          coalesce(sum(stock),0) as units,
          coalesce(sum(stock::numeric*estimated_price),0) as value,
          coalesce(avg(estimated_price),0) as avg_price,
          coalesce(sum(stock::numeric*estimated_price) FILTER (WHERE last_entry_time='mais de 2 anos'),0) as stale_value,
          count(*) FILTER (WHERE last_entry_time='mais de 2 anos') as stale_skus,
          (SELECT json_agg(row_to_json(m)) FROM (
            SELECT coalesce(p2.machine_model,'(sem modelo)') as model, count(*) as cnt
            FROM parts p2
            WHERE p2.subcategory = p.subcategory
            GROUP BY 1 ORDER BY 2 DESC LIMIT 8
          ) m) as top_models,
          (SELECT json_agg(row_to_json(a)) FROM (
            SELECT key as attr, value as val, count(*) as cnt
            FROM parts p3, jsonb_each_text(p3.attributes)
            WHERE p3.subcategory = p.subcategory
            GROUP BY 1,2 ORDER BY 3 DESC LIMIT 12
          ) a) as top_attributes
        FROM parts p
        GROUP BY 1
      ) t
    ),
    'subcategoryByModel', (
      SELECT coalesce(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT
          coalesce(subcategory,'(não classificado)') as subcategory,
          coalesce(machine_model,'(sem modelo)') as model,
          count(*) as skus,
          coalesce(sum(stock),0) as units,
          coalesce(sum(stock::numeric*estimated_price),0) as value,
          coalesce(sum(stock::numeric*estimated_price) FILTER (WHERE last_entry_time='mais de 2 anos'),0) as stale_value
        FROM parts
        GROUP BY 1,2
      ) t
    )
  ) INTO v_result;
  RETURN v_result;
END;
$$;

-- 4) Tabelas de templates e log
CREATE TABLE IF NOT EXISTS public.catalog_report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_shared boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.catalog_report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own or shared templates"
  ON public.catalog_report_templates FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR is_shared = true OR has_role(auth.uid(),'admin'));

CREATE POLICY "Users insert own templates"
  ON public.catalog_report_templates FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users update own templates"
  ON public.catalog_report_templates FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(),'admin'));

CREATE POLICY "Users delete own templates"
  ON public.catalog_report_templates FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_catalog_report_templates_updated
  BEFORE UPDATE ON public.catalog_report_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.catalog_reports_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  format text NOT NULL,
  scope text,
  filters jsonb DEFAULT '{}'::jsonb,
  row_count integer,
  file_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.catalog_reports_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own logs"
  ON public.catalog_reports_log FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'));

CREATE POLICY "Users insert own logs"
  ON public.catalog_reports_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 5) Roda regras agora para popular dados existentes
SELECT public.apply_subcategory_rules(true);
