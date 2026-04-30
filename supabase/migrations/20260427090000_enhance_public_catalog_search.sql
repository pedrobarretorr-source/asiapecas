-- Strengthen public catalog search for codes/OEM, keywords, machine models,
-- compatible models, categories and JSON attributes.
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
  v_terms text[] := ARRAY[]::text[];
  v_tsq tsquery;
  v_sub text := nullif(filters->>'subcategory', '');
  v_mod text := nullif(filters->>'machine_model', '');
  v_fab text := nullif(filters->>'manufacturer', '');
  v_cat text := nullif(filters->>'part_category', '');
  v_segment text := nullif(filters->>'segment', '');
  v_sort text := coalesce(nullif(filters->>'sort', ''), 'relevance');
  v_availability text := nullif(filters->>'availability', '');
  v_attr_key text := nullif(filters->>'attribute_key', '');
  v_attr_val text := nullif(filters->>'attribute_value', '');
  v_stale_only boolean := coalesce((filters->>'stale_only')::boolean, false);
  v_in_stock boolean := coalesce((filters->>'in_stock')::boolean, false);
  v_no_cat boolean := coalesce((filters->>'no_category')::boolean, false);
BEGIN
  IF v_q IS NOT NULL THEN
    v_q_norm := lower(public.immutable_unaccent(v_q));
    v_terms := array_remove(regexp_split_to_array(v_q_norm, '\s+'), '');
    BEGIN
      v_tsq := websearch_to_tsquery('simple', v_q_norm);
    EXCEPTION WHEN OTHERS THEN v_tsq := NULL;
    END;
  END IF;

  RETURN QUERY
  WITH prepared AS (
    SELECT p.*,
      lower(public.immutable_unaccent(concat_ws(
        ' ',
        p.material,
        p.description,
        p.manufacturer,
        p.machine_model,
        p.subcategory,
        p.part_category,
        p.supplier,
        array_to_string(p.compatible_models, ' '),
        p.attributes::text
      ))) AS search_blob
    FROM public.parts p
  ),
  base AS (
    SELECT p.*,
      CASE
        WHEN v_q IS NULL THEN 0::real
        WHEN lower(p.material) = lower(v_q) THEN 1200::real
        WHEN lower(public.immutable_unaccent(p.material)) = v_q_norm THEN 1150::real
        WHEN p.material ILIKE v_q || '%' THEN 700::real
        WHEN p.material ILIKE '%' || v_q || '%' THEN 420::real
        WHEN p.search_blob LIKE '%' || v_q_norm || '%' THEN 260::real
        WHEN coalesce((
          SELECT bool_and(p.search_blob LIKE '%' || term.value || '%')
          FROM unnest(v_terms) AS term(value)
          WHERE length(term.value) >= 2
        ), false) THEN 190::real
        WHEN v_tsq IS NOT NULL AND p.search_vector @@ v_tsq THEN 120::real * ts_rank(p.search_vector, v_tsq)
        ELSE GREATEST(
          similarity(lower(public.immutable_unaccent(coalesce(p.description,''))), v_q_norm),
          similarity(lower(public.immutable_unaccent(coalesce(p.material,''))), v_q_norm),
          similarity(lower(public.immutable_unaccent(coalesce(p.machine_model,''))), v_q_norm),
          similarity(lower(public.immutable_unaccent(coalesce(p.manufacturer,''))), v_q_norm),
          similarity(lower(public.immutable_unaccent(coalesce(p.part_category,''))), v_q_norm),
          similarity(p.search_blob, v_q_norm)
        ) * 70
      END
      + CASE WHEN p.stock > 0 THEN 8 ELSE 0 END AS rscore
    FROM prepared p
    WHERE
      (v_sub IS NULL OR p.subcategory = v_sub) AND
      (v_mod IS NULL OR p.machine_model ILIKE '%' || v_mod || '%') AND
      (v_fab IS NULL OR p.manufacturer ILIKE '%' || v_fab || '%') AND
      (v_cat IS NULL OR p.part_category = v_cat) AND
      (
        v_segment IS NULL OR
        (v_segment = 'mineracao' AND p.is_mineracao) OR
        (v_segment = 'linha_amarela' AND p.is_linha_amarela) OR
        (v_segment = 'perfuratriz' AND p.is_perfuratriz) OR
        (v_segment = 'guindaste' AND p.is_guindaste) OR
        (v_segment = 'caminhao_eletrico' AND p.is_caminhao_eletrico)
      ) AND
      (v_attr_key IS NULL OR v_attr_val IS NULL OR p.attributes->>v_attr_key = v_attr_val) AND
      (NOT v_stale_only OR p.last_entry_time = 'mais de 2 anos') AND
      (NOT v_in_stock OR p.stock > 0) AND
      (v_availability IS NULL OR v_availability = 'all' OR
        (v_availability = 'ready' AND p.stock > 10) OR
        (v_availability = 'low' AND p.stock > 0 AND p.stock <= 10)
      ) AND
      (NOT v_no_cat OR p.subcategory IS NULL) AND
      (
        v_q IS NULL OR
        lower(p.material) = lower(v_q) OR
        lower(public.immutable_unaccent(p.material)) = v_q_norm OR
        p.material ILIKE '%' || v_q || '%' OR
        p.search_blob LIKE '%' || v_q_norm || '%' OR
        (v_tsq IS NOT NULL AND p.search_vector @@ v_tsq) OR
        EXISTS (
          SELECT 1
          FROM unnest(v_terms) AS term(value)
          WHERE length(term.value) >= 2
            AND p.search_blob LIKE '%' || term.value || '%'
        ) OR
        similarity(p.search_blob, v_q_norm) > 0.18 OR
        similarity(lower(public.immutable_unaccent(coalesce(p.description,''))), v_q_norm) > 0.22 OR
        similarity(lower(public.immutable_unaccent(coalesce(p.material,''))), v_q_norm) > 0.28
      )
  ),
  counted AS (SELECT count(*) AS n FROM base)
  SELECT b.id, b.material, b.description, b.manufacturer, b.machine_model,
         b.subcategory, b.part_category, b.stock, b.estimated_price, b.attributes,
         b.last_entry_time, b.image_url, b.rscore, c.n
  FROM base b CROSS JOIN counted c
  ORDER BY
    CASE WHEN v_sort = 'stockDesc' THEN b.stock END DESC NULLS LAST,
    CASE WHEN v_sort = 'nameAsc' THEN b.description END ASC NULLS LAST,
    CASE WHEN v_sort = 'newest' THEN b.created_at END DESC NULLS LAST,
    CASE WHEN v_sort = 'priceAsc' THEN b.estimated_price END ASC NULLS LAST,
    CASE WHEN v_sort = 'priceDesc' THEN b.estimated_price END DESC NULLS LAST,
    b.rscore DESC NULLS LAST,
    (b.stock::numeric * b.estimated_price) DESC NULLS LAST
  LIMIT _limit OFFSET _offset;
END$$;
