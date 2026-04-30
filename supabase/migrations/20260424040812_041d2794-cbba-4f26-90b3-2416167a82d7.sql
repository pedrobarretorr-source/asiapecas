
-- ============================================================
-- 1. SANEAMENTO: limpar atributos corrompidos (medidas inválidas etc.)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_bad_attributes()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_count int := 0;
BEGIN
  -- Pneus: medidas que não estão no formato canônico viram NULL
  UPDATE public.parts
  SET attributes = attributes - 'medida'
  WHERE subcategory = 'Pneus'
    AND attributes ? 'medida'
    AND NOT (attributes->>'medida' ~ '^(\d{2}\.?\d?R\d{2}|\d{1,2}\.\d{1,2}-\d{2}|\d{3}/\d{2,3}R\d{2})$');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END$$;

-- ============================================================
-- 2. CLASSIFICAÇÃO V4 — pipeline determinístico
-- ============================================================
CREATE OR REPLACE FUNCTION public.classify_parts_v4(_only_missing boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_stage1 int := 0; v_stage2 int := 0; v_stage3 int := 0; v_stage4 int := 0; v_review int := 0;
  v_total int;
  r RECORD; tax RECORD;
  v_text text; v_text_norm text;
  v_attrs jsonb; v_match text[]; v_key text; v_pattern text;
  v_matched boolean;
BEGIN
  -- Reset se for full re-run
  IF NOT _only_missing THEN
    UPDATE public.parts SET subcategory=NULL, subcategory_source=NULL,
      subcategory_confidence=NULL, attributes='{}'::jsonb, needs_review=false,
      classification_method=NULL;
  END IF;

  -- ESTÁGIO 1: dicionário canônico (regex de sinônimos)
  FOR r IN
    SELECT id, description, material, manufacturer, machine_model, part_category
    FROM public.parts
    WHERE subcategory IS NULL
  LOOP
    v_text_norm := lower(public.immutable_unaccent(coalesce(r.description,'') || ' ' || coalesce(r.material,'')));
    v_matched := false;

    FOR tax IN
      SELECT * FROM public.subcategory_taxonomy WHERE active ORDER BY priority ASC
    LOOP
      -- check negative terms first
      IF tax.negative_terms IS NOT NULL AND array_length(tax.negative_terms,1) > 0 THEN
        IF EXISTS (SELECT 1 FROM unnest(tax.negative_terms) n WHERE v_text_norm ~* n) THEN
          CONTINUE;
        END IF;
      END IF;

      -- check synonyms (any of pt/en/es)
      IF EXISTS (
        SELECT 1 FROM unnest(tax.synonyms_pt || tax.synonyms_en || tax.synonyms_es) s
        WHERE v_text_norm ~* ('\m' || s || '\M')
      ) THEN
        v_attrs := '{}'::jsonb;
        -- extract attributes
        FOR v_key, v_pattern IN
          SELECT k, v::text FROM jsonb_each_text(coalesce(tax.attribute_extractors,'{}'::jsonb))
        LOOP
          v_match := regexp_match(v_text_norm, v_pattern);
          IF v_match IS NOT NULL THEN
            -- categorize by key prefix (e.g. "tipo_led" -> attribute "tipo" = "LED")
            IF v_key LIKE 'tipo_%' THEN
              v_attrs := v_attrs || jsonb_build_object('tipo', initcap(replace(v_key,'tipo_','')));
            ELSIF v_key LIKE 'fluido_%' THEN
              v_attrs := v_attrs || jsonb_build_object('fluido', initcap(replace(v_key,'fluido_','')));
            ELSIF v_key LIKE 'posicao_%' THEN
              v_attrs := v_attrs || jsonb_build_object('posicao', initcap(replace(v_key,'posicao_','')));
            ELSIF v_key LIKE 'componente_%' THEN
              v_attrs := v_attrs || jsonb_build_object('componente', initcap(replace(v_key,'componente_','')));
            ELSIF v_key LIKE 'grandeza_%' THEN
              v_attrs := v_attrs || jsonb_build_object('grandeza', initcap(replace(v_key,'grandeza_','')));
            ELSIF v_key = 'medida_radial' AND array_length(v_match,1) >= 2 THEN
              v_attrs := v_attrs || jsonb_build_object('medida', upper(v_match[1] || 'R' || v_match[2]), 'aro', v_match[2], 'tipo','Radial');
            ELSIF v_key = 'medida_diagonal' AND array_length(v_match,1) >= 2 THEN
              v_attrs := v_attrs || jsonb_build_object('medida', v_match[1] || '-' || v_match[2], 'aro', v_match[2], 'tipo','Diagonal');
            ELSIF v_key = 'medida_metric' AND array_length(v_match,1) >= 3 THEN
              v_attrs := v_attrs || jsonb_build_object('medida', v_match[1] || '/' || v_match[2] || 'R' || v_match[3], 'aro', v_match[3]);
            ELSE
              v_attrs := v_attrs || jsonb_build_object(v_key, upper(v_match[1]));
            END IF;
          END IF;
        END LOOP;

        UPDATE public.parts
        SET subcategory = tax.subcategory,
            subcategory_source = 'dict',
            classification_method = 'dict',
            subcategory_confidence = 0.95,
            attributes = coalesce(attributes,'{}'::jsonb) || v_attrs,
            needs_review = false
        WHERE id = r.id;
        v_stage1 := v_stage1 + 1;
        v_matched := true;
        EXIT;
      END IF;
    END LOOP;
  END LOOP;

  -- ESTÁGIO 2: trigram fuzzy (typos / abreviações)
  WITH candidates AS (
    SELECT p.id, t.subcategory,
           max(similarity(lower(public.immutable_unaccent(p.description)), s)) AS sim
    FROM public.parts p
    CROSS JOIN public.subcategory_taxonomy t
    CROSS JOIN unnest(t.synonyms_pt || t.synonyms_en || t.synonyms_es) s
    WHERE p.subcategory IS NULL AND t.active
      AND length(p.description) >= 4
      AND similarity(lower(public.immutable_unaccent(p.description)), s) > 0.45
      AND NOT EXISTS (
        SELECT 1 FROM unnest(t.negative_terms) n
        WHERE lower(public.immutable_unaccent(p.description)) ~* n
      )
    GROUP BY p.id, t.subcategory
  ),
  best AS (
    SELECT DISTINCT ON (id) id, subcategory, sim
    FROM candidates
    ORDER BY id, sim DESC
  )
  UPDATE public.parts p
  SET subcategory = b.subcategory,
      subcategory_source = 'fuzzy',
      classification_method = 'fuzzy',
      subcategory_confidence = round(b.sim::numeric, 2)
  FROM best b
  WHERE p.id = b.id AND p.subcategory IS NULL;
  GET DIAGNOSTICS v_stage2 = ROW_COUNT;

  -- ESTÁGIO 3: herança por part_category (mais comum naquela categoria)
  WITH cat_dom AS (
    SELECT part_category,
           mode() WITHIN GROUP (ORDER BY subcategory) AS dom_sub,
           count(*) FILTER (WHERE subcategory IS NOT NULL) AS n_cls,
           count(*) AS n_total
    FROM public.parts
    WHERE part_category IS NOT NULL AND part_category <> ''
    GROUP BY part_category
    HAVING count(*) FILTER (WHERE subcategory IS NOT NULL) >= 5
       AND count(*) FILTER (WHERE subcategory IS NOT NULL)::float / count(*) >= 0.6
  )
  UPDATE public.parts p
  SET subcategory = c.dom_sub,
      subcategory_source = 'inherit',
      classification_method = 'inherit',
      subcategory_confidence = 0.6
  FROM cat_dom c
  WHERE p.part_category = c.part_category AND p.subcategory IS NULL;
  GET DIAGNOSTICS v_stage3 = ROW_COUNT;

  -- ESTÁGIO 4: cluster por prefixo de código de material
  WITH clusters AS (
    SELECT substring(material, 1, 6) AS prefix,
           mode() WITHIN GROUP (ORDER BY subcategory) AS dom_sub,
           count(*) FILTER (WHERE subcategory IS NOT NULL) AS n_cls,
           count(*) AS n_total
    FROM public.parts
    WHERE length(material) >= 6
    GROUP BY substring(material,1,6)
    HAVING count(*) FILTER (WHERE subcategory IS NOT NULL) >= 3
       AND count(*) FILTER (WHERE subcategory IS NOT NULL)::float / count(*) >= 0.7
  )
  UPDATE public.parts p
  SET subcategory = c.dom_sub,
      subcategory_source = 'code_cluster',
      classification_method = 'code_cluster',
      subcategory_confidence = 0.55
  FROM clusters c
  WHERE substring(p.material,1,6) = c.prefix AND p.subcategory IS NULL;
  GET DIAGNOSTICS v_stage4 = ROW_COUNT;

  -- ESTÁGIO 5: resíduo => needs_review
  UPDATE public.parts SET needs_review = true, classification_method = 'review'
  WHERE subcategory IS NULL;
  GET DIAGNOSTICS v_review = ROW_COUNT;

  SELECT count(*) INTO v_total FROM public.parts;

  RETURN jsonb_build_object(
    'stage1_dict', v_stage1,
    'stage2_fuzzy', v_stage2,
    'stage3_inherit', v_stage3,
    'stage4_code_cluster', v_stage4,
    'stage5_review', v_review,
    'total', v_total,
    'classified', v_total - v_review,
    'coverage_pct', round(((v_total - v_review)::numeric / nullif(v_total,0)) * 100, 2)
  );
END$$;

-- ============================================================
-- 3. BUSCA INTELIGENTE
-- ============================================================
CREATE OR REPLACE FUNCTION public.search_parts(
  q text DEFAULT NULL,
  filters jsonb DEFAULT '{}'::jsonb,
  _limit int DEFAULT 50,
  _offset int DEFAULT 0
)
RETURNS TABLE(
  id uuid, material text, description text, manufacturer text,
  machine_model text, subcategory text, part_category text,
  stock int, estimated_price numeric, attributes jsonb,
  last_entry_time text, image_url text, score real, total_count bigint
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_q text := nullif(btrim(coalesce(q,'')), '');
  v_q_norm text;
  v_tsq tsquery;
  v_sub text := filters->>'subcategory';
  v_mod text := filters->>'machine_model';
  v_fab text := filters->>'manufacturer';
  v_cat text := filters->>'part_category';
  v_attr_key text := filters->>'attribute_key';
  v_attr_val text := filters->>'attribute_value';
  v_stale_only boolean := coalesce((filters->>'stale_only')::boolean, false);
  v_in_stock boolean := coalesce((filters->>'in_stock')::boolean, false);
  v_no_cat boolean := coalesce((filters->>'no_category')::boolean, false);
BEGIN
  IF v_q IS NOT NULL THEN
    v_q_norm := lower(public.immutable_unaccent(v_q));
    BEGIN
      v_tsq := websearch_to_tsquery('simple', v_q_norm);
    EXCEPTION WHEN OTHERS THEN v_tsq := NULL;
    END;
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT p.*,
      CASE
        WHEN v_q IS NULL THEN 0::real
        WHEN lower(p.material) = lower(v_q) THEN 1000::real
        WHEN p.material ILIKE v_q || '%' THEN 500::real
        WHEN p.material ILIKE '%' || v_q || '%' THEN 250::real
        WHEN v_tsq IS NOT NULL AND p.search_vector @@ v_tsq THEN 100::real * ts_rank(p.search_vector, v_tsq)
        ELSE GREATEST(
          similarity(lower(public.immutable_unaccent(p.description)), v_q_norm),
          similarity(lower(p.material), lower(v_q))
        ) * 50
      END AS rscore
    FROM public.parts p
    WHERE
      (v_sub IS NULL OR p.subcategory = v_sub) AND
      (v_mod IS NULL OR p.machine_model ILIKE '%' || v_mod || '%') AND
      (v_fab IS NULL OR p.manufacturer ILIKE '%' || v_fab || '%') AND
      (v_cat IS NULL OR p.part_category = v_cat) AND
      (v_attr_key IS NULL OR v_attr_val IS NULL OR p.attributes->>v_attr_key = v_attr_val) AND
      (NOT v_stale_only OR p.last_entry_time = 'mais de 2 anos') AND
      (NOT v_in_stock OR p.stock > 0) AND
      (NOT v_no_cat OR p.subcategory IS NULL) AND
      (
        v_q IS NULL OR
        lower(p.material) = lower(v_q) OR
        p.material ILIKE '%' || v_q || '%' OR
        (v_tsq IS NOT NULL AND p.search_vector @@ v_tsq) OR
        similarity(lower(public.immutable_unaccent(p.description)), v_q_norm) > 0.25 OR
        similarity(lower(p.material), lower(v_q)) > 0.3
      )
  ),
  counted AS ( SELECT count(*) AS n FROM base )
  SELECT b.id, b.material, b.description, b.manufacturer, b.machine_model,
         b.subcategory, b.part_category, b.stock, b.estimated_price, b.attributes,
         b.last_entry_time, b.image_url, b.rscore, c.n
  FROM base b CROSS JOIN counted c
  ORDER BY b.rscore DESC NULLS LAST,
           (b.stock::numeric * b.estimated_price) DESC NULLS LAST
  LIMIT _limit OFFSET _offset;
END$$;

-- ============================================================
-- 4. VIEW UNIFICADA DE INTELIGÊNCIA
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_intelligence_view(filters jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_sub text := filters->>'subcategory';
  v_mod text := filters->>'machine_model';
  v_fab text := filters->>'manufacturer';
  v_attr_key text := filters->>'attribute_key';
  v_attr_val text := filters->>'attribute_value';
  v_result jsonb;
BEGIN
  WITH filtered AS (
    SELECT * FROM public.parts p
    WHERE (v_sub IS NULL OR p.subcategory = v_sub)
      AND (v_mod IS NULL OR p.machine_model = v_mod)
      AND (v_fab IS NULL OR p.manufacturer = v_fab)
      AND (v_attr_key IS NULL OR v_attr_val IS NULL OR p.attributes->>v_attr_key = v_attr_val)
  )
  SELECT jsonb_build_object(
    'generated_at', now(),
    'kpis', (
      SELECT jsonb_build_object(
        'total_skus', count(*),
        'total_units', coalesce(sum(stock),0),
        'total_value', coalesce(sum(stock::numeric * estimated_price),0),
        'classified_skus', count(*) FILTER (WHERE subcategory IS NOT NULL),
        'review_skus', count(*) FILTER (WHERE needs_review),
        'coverage_pct', round((count(*) FILTER (WHERE subcategory IS NOT NULL))::numeric / nullif(count(*),0) * 100, 1),
        'stale_value', coalesce(sum(stock::numeric * estimated_price) FILTER (WHERE last_entry_time = 'mais de 2 anos'),0),
        'stale_skus', count(*) FILTER (WHERE last_entry_time = 'mais de 2 anos'),
        'zero_stock_skus', count(*) FILTER (WHERE stock <= 0),
        'critical_skus', count(*) FILTER (WHERE manufacturer IS NULL OR part_category IS NULL OR length(coalesce(description,'')) < 10)
      ) FROM filtered
    ),
    'gallery', (
      SELECT coalesce(jsonb_agg(row_to_json(g) ORDER BY g.value DESC), '[]'::jsonb) FROM (
        SELECT
          coalesce(t.subcategory, '(não classificado)') AS subcategory,
          coalesce(tax.category_group, 'Outros') AS category_group,
          count(*) AS skus,
          coalesce(sum(t.stock),0) AS units,
          coalesce(sum(t.stock::numeric * t.estimated_price),0) AS value,
          coalesce(sum(t.stock::numeric * t.estimated_price) FILTER (WHERE t.last_entry_time='mais de 2 anos'),0) AS stale_value,
          (
            SELECT coalesce(jsonb_agg(jsonb_build_object('attr',ak,'val',av,'cnt',cnt,'value',vsum)),'[]'::jsonb)
            FROM (
              SELECT key AS ak, value AS av, count(*) AS cnt,
                     sum(p2.stock::numeric * p2.estimated_price) AS vsum
              FROM filtered p2, jsonb_each_text(p2.attributes)
              WHERE coalesce(p2.subcategory,'(não classificado)') = coalesce(t.subcategory,'(não classificado)')
              GROUP BY 1,2
              ORDER BY count(*) DESC
              LIMIT 12
            ) a
          ) AS chips,
          (
            SELECT coalesce(jsonb_agg(jsonb_build_object('model',mm,'cnt',mc)),'[]'::jsonb)
            FROM (
              SELECT coalesce(p3.machine_model,'(sem modelo)') AS mm, count(*) AS mc
              FROM filtered p3
              WHERE coalesce(p3.subcategory,'(não classificado)') = coalesce(t.subcategory,'(não classificado)')
              GROUP BY 1 ORDER BY 2 DESC LIMIT 8
            ) m
          ) AS top_models
        FROM filtered t
        LEFT JOIN public.subcategory_taxonomy tax ON tax.subcategory = t.subcategory
        GROUP BY t.subcategory, tax.category_group
      ) g
    ),
    'matrix', (
      SELECT coalesce(jsonb_agg(row_to_json(m)),'[]'::jsonb) FROM (
        SELECT coalesce(subcategory,'(não classificado)') AS subcategory,
               coalesce(machine_model,'(sem modelo)') AS model,
               count(*) AS skus,
               coalesce(sum(stock::numeric * estimated_price),0) AS value
        FROM filtered GROUP BY 1,2
      ) m
    ),
    'health', (
      SELECT jsonb_build_object(
        'classified', jsonb_build_object(
          'pct', round((count(*) FILTER (WHERE subcategory IS NOT NULL))::numeric / nullif(count(*),0) * 100, 1),
          'level', CASE WHEN count(*) FILTER (WHERE subcategory IS NOT NULL)::numeric / nullif(count(*),0) > 0.9 THEN 'green'
                        WHEN count(*) FILTER (WHERE subcategory IS NOT NULL)::numeric / nullif(count(*),0) > 0.7 THEN 'yellow'
                        ELSE 'red' END
        ),
        'attributes', jsonb_build_object(
          'pct', round((count(*) FILTER (WHERE attributes <> '{}'::jsonb))::numeric / nullif(count(*) FILTER (WHERE subcategory IS NOT NULL),0) * 100, 1),
          'level', CASE WHEN (count(*) FILTER (WHERE attributes <> '{}'::jsonb))::numeric / nullif(count(*) FILTER (WHERE subcategory IS NOT NULL),0) > 0.7 THEN 'green'
                        WHEN (count(*) FILTER (WHERE attributes <> '{}'::jsonb))::numeric / nullif(count(*) FILTER (WHERE subcategory IS NOT NULL),0) > 0.4 THEN 'yellow'
                        ELSE 'red' END
        ),
        'critical', jsonb_build_object(
          'count', count(*) FILTER (WHERE manufacturer IS NULL OR part_category IS NULL OR length(coalesce(description,'')) < 10),
          'level', CASE WHEN count(*) FILTER (WHERE manufacturer IS NULL OR part_category IS NULL OR length(coalesce(description,'')) < 10) = 0 THEN 'green'
                        WHEN count(*) FILTER (WHERE manufacturer IS NULL OR part_category IS NULL OR length(coalesce(description,'')) < 10) < count(*) * 0.05 THEN 'yellow'
                        ELSE 'red' END
        )
      ) FROM filtered
    )
  ) INTO v_result;
  RETURN v_result;
END$$;

-- ============================================================
-- 5. RPC drilldown — SKUs filtrados + máquinas compatíveis
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_drilldown(filters jsonb DEFAULT '{}'::jsonb, _limit int DEFAULT 200)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_sub text := filters->>'subcategory';
  v_mod text := filters->>'machine_model';
  v_fab text := filters->>'manufacturer';
  v_attr_key text := filters->>'attribute_key';
  v_attr_val text := filters->>'attribute_value';
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'parts', coalesce(jsonb_agg(row_to_json(x) ORDER BY x.value DESC), '[]'::jsonb)
    )
    FROM (
      SELECT p.id, p.material, p.description, p.manufacturer, p.machine_model,
             p.subcategory, p.stock, p.estimated_price, p.attributes,
             p.last_entry_time, p.image_url,
             (p.stock::numeric * p.estimated_price) AS value,
             coalesce(p.compatible_models, ARRAY[]::text[]) ||
             coalesce(ARRAY(SELECT DISTINCT ce.model FROM public.customer_equipment ce
                            WHERE ce.model IS NOT NULL AND p.machine_model IS NOT NULL
                              AND ce.model ILIKE '%' || p.machine_model || '%'
                            LIMIT 5), ARRAY[]::text[]) AS all_compatible_models
      FROM public.parts p
      WHERE (v_sub IS NULL OR p.subcategory = v_sub)
        AND (v_mod IS NULL OR p.machine_model = v_mod)
        AND (v_fab IS NULL OR p.manufacturer = v_fab)
        AND (v_attr_key IS NULL OR v_attr_val IS NULL OR p.attributes->>v_attr_key = v_attr_val)
      ORDER BY (p.stock::numeric * p.estimated_price) DESC NULLS LAST
      LIMIT _limit
    ) x
  );
END$$;
