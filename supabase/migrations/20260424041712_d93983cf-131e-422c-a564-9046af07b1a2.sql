CREATE OR REPLACE FUNCTION public.classify_parts_v4(_only_missing boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_stage1 int := 0; v_stage2 int := 0; v_stage3 int := 0; v_stage4 int := 0; v_review int := 0;
  v_total int;
  r RECORD; tax RECORD;
  v_text_norm text;
  v_attrs jsonb; v_match text[]; v_key text; v_pattern text;
BEGIN
  IF NOT _only_missing THEN
    UPDATE public.parts SET subcategory=NULL, subcategory_source=NULL,
      subcategory_confidence=NULL, attributes='{}'::jsonb, needs_review=false,
      classification_method=NULL;
  END IF;

  FOR r IN
    SELECT id, description, material FROM public.parts WHERE subcategory IS NULL
  LOOP
    v_text_norm := lower(public.immutable_unaccent(coalesce(r.description,'') || ' ' || coalesce(r.material,'')));

    FOR tax IN
      SELECT * FROM public.subcategory_taxonomy WHERE active ORDER BY priority ASC
    LOOP
      IF tax.negative_terms IS NOT NULL AND array_length(tax.negative_terms,1) > 0 THEN
        IF EXISTS (SELECT 1 FROM unnest(tax.negative_terms) n WHERE v_text_norm ~* n) THEN
          CONTINUE;
        END IF;
      END IF;

      IF EXISTS (
        SELECT 1 FROM unnest(tax.synonyms_pt || tax.synonyms_en || tax.synonyms_es) s
        WHERE v_text_norm ~* ('\m' || s || '\M')
      ) THEN
        v_attrs := '{}'::jsonb;
        FOR v_key, v_pattern IN
          SELECT je.key, je.value FROM jsonb_each_text(coalesce(tax.attribute_extractors,'{}'::jsonb)) je
        LOOP
          v_match := regexp_match(v_text_norm, v_pattern);
          IF v_match IS NOT NULL THEN
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
        SET subcategory = tax.subcategory, subcategory_source = 'dict',
            classification_method = 'dict', subcategory_confidence = 0.95,
            attributes = coalesce(attributes,'{}'::jsonb) || v_attrs,
            needs_review = false
        WHERE id = r.id;
        v_stage1 := v_stage1 + 1;
        EXIT;
      END IF;
    END LOOP;
  END LOOP;

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
    FROM candidates ORDER BY id, sim DESC
  )
  UPDATE public.parts p
  SET subcategory = b.subcategory, subcategory_source = 'fuzzy',
      classification_method = 'fuzzy', subcategory_confidence = round(b.sim::numeric, 2)
  FROM best b
  WHERE p.id = b.id AND p.subcategory IS NULL;
  GET DIAGNOSTICS v_stage2 = ROW_COUNT;

  WITH cat_dom AS (
    SELECT part_category,
           mode() WITHIN GROUP (ORDER BY subcategory) AS dom_sub
    FROM public.parts
    WHERE part_category IS NOT NULL AND part_category <> ''
    GROUP BY part_category
    HAVING count(*) FILTER (WHERE subcategory IS NOT NULL) >= 5
       AND count(*) FILTER (WHERE subcategory IS NOT NULL)::float / count(*) >= 0.6
  )
  UPDATE public.parts p
  SET subcategory = c.dom_sub, subcategory_source = 'inherit',
      classification_method = 'inherit', subcategory_confidence = 0.6
  FROM cat_dom c
  WHERE p.part_category = c.part_category AND p.subcategory IS NULL;
  GET DIAGNOSTICS v_stage3 = ROW_COUNT;

  WITH clusters AS (
    SELECT substring(material, 1, 6) AS prefix,
           mode() WITHIN GROUP (ORDER BY subcategory) AS dom_sub
    FROM public.parts
    WHERE length(material) >= 6
    GROUP BY substring(material,1,6)
    HAVING count(*) FILTER (WHERE subcategory IS NOT NULL) >= 3
       AND count(*) FILTER (WHERE subcategory IS NOT NULL)::float / count(*) >= 0.7
  )
  UPDATE public.parts p
  SET subcategory = c.dom_sub, subcategory_source = 'code_cluster',
      classification_method = 'code_cluster', subcategory_confidence = 0.55
  FROM clusters c
  WHERE substring(p.material,1,6) = c.prefix AND p.subcategory IS NULL;
  GET DIAGNOSTICS v_stage4 = ROW_COUNT;

  UPDATE public.parts SET needs_review = true, classification_method = 'review'
  WHERE subcategory IS NULL;
  GET DIAGNOSTICS v_review = ROW_COUNT;

  SELECT count(*) INTO v_total FROM public.parts;
  RETURN jsonb_build_object(
    'stage1_dict', v_stage1, 'stage2_fuzzy', v_stage2,
    'stage3_inherit', v_stage3, 'stage4_code_cluster', v_stage4,
    'stage5_review', v_review, 'total', v_total,
    'classified', v_total - v_review,
    'coverage_pct', round(((v_total - v_review)::numeric / nullif(v_total,0)) * 100, 2)
  );
END$$;

UPDATE public.subcategory_taxonomy
SET attribute_extractors = jsonb_build_object(
  'medida_radial',  '\m(\d{2}\.?\d?)r(\d{2})\M',
  'medida_diagonal','\m(\d{1,2}\.\d{1,2})-(\d{2})\M',
  'medida_metric',  '\m(\d{3})/(\d{2,3})r(\d{2})\M'
),
negative_terms = ARRAY['camara','câmara','protetor','flap','aro de roda','wheel rim']
WHERE subcategory = 'Pneus';