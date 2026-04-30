CREATE OR REPLACE FUNCTION public.get_stock_analytics()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
  v_total_value numeric;
  v_total_skus integer;
BEGIN
  SELECT coalesce(sum(stock::numeric * estimated_price), 0), count(*)
    INTO v_total_value, v_total_skus FROM parts;

  SELECT json_build_object(
    'generatedAt', now(),
    'kpis', json_build_object(
      'totalSkus', v_total_skus,
      'totalUnits', (SELECT coalesce(sum(stock),0) FROM parts),
      'totalValue', v_total_value,
      'avgPrice', (SELECT coalesce(avg(estimated_price),0) FROM parts),
      'staleValue', (SELECT coalesce(sum(stock::numeric*estimated_price),0) FROM parts WHERE last_entry_time='mais de 2 anos'),
      'staleSkus', (SELECT count(*) FROM parts WHERE last_entry_time='mais de 2 anos'),
      'healthyValue', (SELECT coalesce(sum(stock::numeric*estimated_price),0) FROM parts WHERE last_entry_time='6 até 12 meses'),
      'neverSoldSkus', (SELECT count(*) FROM parts p WHERE NOT EXISTS (SELECT 1 FROM sale_items si WHERE si.part_id=p.id)),
      'soldSkus', (SELECT count(DISTINCT part_id) FROM sale_items WHERE part_id IS NOT NULL),
      'uncategorizedValue', (SELECT coalesce(sum(stock::numeric*estimated_price),0) FROM parts WHERE part_category IS NULL OR part_category=''),
      'accessoriesValue', (SELECT coalesce(sum(stock::numeric*estimated_price),0) FROM parts WHERE part_category ILIKE '%acess%'),
      'accessoriesSkus', (SELECT count(*) FROM parts WHERE part_category ILIKE '%acess%')
    ),
    'byCategory', (
      SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.value DESC), '[]'::json) FROM (
        SELECT
          coalesce(nullif(part_category,''), 'Sem categoria') as category,
          count(*) as skus,
          coalesce(sum(stock),0) as units,
          coalesce(sum(stock::numeric*estimated_price),0) as value,
          coalesce(avg(estimated_price),0) as avg_price,
          coalesce(sum(stock::numeric*estimated_price) FILTER (WHERE last_entry_time='mais de 2 anos'),0) as stale_value,
          coalesce(sum(stock::numeric*estimated_price) FILTER (WHERE last_entry_time='1 ano até 2 anos'),0) as mid_value,
          coalesce(sum(stock::numeric*estimated_price) FILTER (WHERE last_entry_time='6 até 12 meses'),0) as fresh_value,
          count(*) FILTER (WHERE last_entry_time='mais de 2 anos') as stale_skus
        FROM parts GROUP BY 1
      ) t
    ),
    'byTime', (
      SELECT coalesce(json_agg(row_to_json(t)),'[]'::json) FROM (
        SELECT coalesce(last_entry_time,'Sem data') as period,
               count(*) as skus,
               coalesce(sum(stock),0) as units,
               coalesce(sum(stock::numeric*estimated_price),0) as value
        FROM parts GROUP BY 1
      ) t
    ),
    'byManufacturer', (
      SELECT coalesce(json_agg(row_to_json(t) ORDER BY t.value DESC),'[]'::json) FROM (
        SELECT coalesce(manufacturer,'Sem fabricante') as manufacturer,
               count(*) as skus,
               coalesce(sum(stock),0) as units,
               coalesce(sum(stock::numeric*estimated_price),0) as value,
               coalesce(sum(stock::numeric*estimated_price) FILTER (WHERE last_entry_time='mais de 2 anos'),0) as stale_value
        FROM parts GROUP BY 1 LIMIT 25
      ) t
    ),
    'manufacturerCategoryHeatmap', (
      SELECT coalesce(json_agg(row_to_json(t)),'[]'::json) FROM (
        SELECT coalesce(manufacturer,'Sem fabricante') as manufacturer,
               coalesce(nullif(part_category,''),'Sem categoria') as category,
               coalesce(sum(stock::numeric*estimated_price),0) as value,
               coalesce(sum(stock::numeric*estimated_price) FILTER (WHERE last_entry_time='mais de 2 anos'),0) as stale_value
        FROM parts GROUP BY 1,2
      ) t
    ),
    'topStaleParts', (
      SELECT coalesce(json_agg(row_to_json(t)),'[]'::json) FROM (
        SELECT id, material, description, manufacturer, machine_model, part_category,
               stock, estimated_price,
               (stock::numeric*estimated_price) as total_value,
               last_entry_time
        FROM parts WHERE last_entry_time='mais de 2 anos'
        ORDER BY stock::numeric*estimated_price DESC LIMIT 50
      ) t
    ),
    'bcgSample', (
      SELECT coalesce(json_agg(row_to_json(t)),'[]'::json) FROM (
        SELECT p.id, p.material, p.description, p.part_category, p.manufacturer,
               p.stock, p.estimated_price,
               coalesce((SELECT sum(si.quantity) FROM sale_items si JOIN sales s ON s.id=si.sale_id
                         WHERE si.part_id=p.id AND s.sale_date > now() - interval '12 months' AND s.status<>'cancelado'),0) as sold_12m
        FROM parts p
        ORDER BY p.stock::numeric*p.estimated_price DESC
        LIMIT 500
      ) t
    ),
    'dataHealth', (
      WITH
      dup_groups AS (
        SELECT
          lower(btrim(regexp_replace(description, '\s+', ' ', 'g'))) as norm_desc,
          coalesce(manufacturer, '') as mfr,
          array_agg(id) as ids,
          count(*) as cnt
        FROM parts
        WHERE description IS NOT NULL AND length(btrim(description)) > 0
        GROUP BY 1, 2
        HAVING count(*) > 1 AND coalesce(manufacturer, '') <> ''
      ),
      dup_high AS (
        SELECT p.id, p.machine_model, dg.ids, dg.norm_desc, dg.mfr
        FROM dup_groups dg
        CROSS JOIN LATERAL unnest(dg.ids) as pid
        JOIN parts p ON p.id = pid
      ),
      dup_high_groups AS (
        SELECT norm_desc, mfr, coalesce(machine_model, '') as model, array_agg(id) as ids, count(*) as cnt
        FROM dup_high
        GROUP BY 1, 2, 3
        HAVING count(*) > 1
      ),
      cat_stats AS (
        SELECT part_category, avg(estimated_price) as mu, stddev_pop(estimated_price) as sigma
        FROM parts WHERE estimated_price > 0 AND part_category IS NOT NULL
        GROUP BY part_category HAVING count(*) >= 10 AND stddev_pop(estimated_price) > 0
      ),
      outliers AS (
        SELECT p.id FROM parts p JOIN cat_stats c ON c.part_category = p.part_category
        WHERE p.estimated_price > 0
          AND abs((p.estimated_price - c.mu) / nullif(c.sigma, 0)) > 3
      ),
      short_critical AS (
        SELECT id FROM parts WHERE length(coalesce(description,'')) < 10
      ),
      short_warn AS (
        SELECT id FROM parts
        WHERE length(coalesce(description,'')) BETWEEN 10 AND 19
          AND description !~ '(GB/T|DIN|ISO|M\d+|\d+x\d+|\d+mm|\d+MM)'
      ),
      non_latin AS (
        SELECT id FROM parts WHERE description ~ '[^\x00-\x7FÀ-ÿ\s]'
      ),
      desc_eq_material AS (
        SELECT id FROM parts
        WHERE upper(btrim(description)) = upper(btrim(material))
           OR upper(btrim(description)) LIKE upper(btrim(material)) || '%'
        LIMIT 500
      ),
      no_compat AS (
        SELECT id FROM parts
        WHERE compatible_models IS NULL OR array_length(compatible_models, 1) IS NULL
      )
      SELECT json_build_object(
        'totalSkus', v_total_skus,
        'noManufacturer', json_build_object(
          'count', (SELECT count(*) FROM parts WHERE manufacturer IS NULL OR manufacturer=''),
          'severity', 'critical',
          'sample_ids', (SELECT coalesce(array_agg(id), '{}'::uuid[]) FROM (
            SELECT id FROM parts WHERE manufacturer IS NULL OR manufacturer='' LIMIT 50) s)
        ),
        'noModel', json_build_object(
          'count', (SELECT count(*) FROM parts WHERE machine_model IS NULL OR machine_model=''),
          'severity', 'warning',
          'sample_ids', (SELECT coalesce(array_agg(id), '{}'::uuid[]) FROM (
            SELECT id FROM parts WHERE machine_model IS NULL OR machine_model='' LIMIT 50) s)
        ),
        'noCategory', json_build_object(
          'count', (SELECT count(*) FROM parts WHERE part_category IS NULL OR part_category=''),
          'severity', 'critical',
          'sample_ids', (SELECT coalesce(array_agg(id), '{}'::uuid[]) FROM (
            SELECT id FROM parts WHERE part_category IS NULL OR part_category='' LIMIT 50) s)
        ),
        'shortDescriptionCritical', json_build_object(
          'count', (SELECT count(*) FROM short_critical),
          'severity', 'critical',
          'sample_ids', (SELECT coalesce(array_agg(id), '{}'::uuid[]) FROM (SELECT id FROM short_critical LIMIT 50) s)
        ),
        'shortDescriptionWarn', json_build_object(
          'count', (SELECT count(*) FROM short_warn),
          'severity', 'warning',
          'sample_ids', (SELECT coalesce(array_agg(id), '{}'::uuid[]) FROM (SELECT id FROM short_warn LIMIT 50) s)
        ),
        'duplicateGroupsHigh', json_build_object(
          'count', (SELECT count(*) FROM dup_high_groups),
          'severity', 'critical',
          'sample_ids', (SELECT coalesce(array_agg(pid), '{}'::uuid[]) FROM (
            SELECT unnest(ids) as pid FROM dup_high_groups LIMIT 50) s)
        ),
        'duplicateGroupsMed', json_build_object(
          'count', (SELECT count(*) FROM dup_groups) - (SELECT count(*) FROM dup_high_groups),
          'severity', 'warning',
          'sample_ids', (SELECT coalesce(array_agg(pid), '{}'::uuid[]) FROM (
            SELECT unnest(dg.ids) as pid FROM dup_groups dg
            WHERE NOT EXISTS (SELECT 1 FROM dup_high_groups dh WHERE dh.norm_desc = dg.norm_desc AND dh.mfr = dg.mfr)
            LIMIT 50) s)
        ),
        'priceOutliers', json_build_object(
          'count', (SELECT count(*) FROM outliers),
          'severity', 'warning',
          'sample_ids', (SELECT coalesce(array_agg(id), '{}'::uuid[]) FROM (SELECT id FROM outliers LIMIT 50) s)
        ),
        'nonLatinDescription', json_build_object(
          'count', (SELECT count(*) FROM non_latin),
          'severity', 'critical',
          'sample_ids', (SELECT coalesce(array_agg(id), '{}'::uuid[]) FROM (SELECT id FROM non_latin LIMIT 50) s)
        ),
        'descriptionEqualsMaterial', json_build_object(
          'count', (SELECT count(*) FROM desc_eq_material),
          'severity', 'warning',
          'sample_ids', (SELECT coalesce(array_agg(id), '{}'::uuid[]) FROM (SELECT id FROM desc_eq_material LIMIT 50) s)
        ),
        'noCompatibleModels', json_build_object(
          'count', (SELECT count(*) FROM no_compat),
          'severity', 'info',
          'sample_ids', (SELECT coalesce(array_agg(id), '{}'::uuid[]) FROM (SELECT id FROM no_compat LIMIT 50) s)
        ),
        'zeroPrice', json_build_object(
          'count', (SELECT count(*) FROM parts WHERE estimated_price<=0),
          'severity', 'critical',
          'sample_ids', (SELECT coalesce(array_agg(id), '{}'::uuid[]) FROM (
            SELECT id FROM parts WHERE estimated_price<=0 LIMIT 50) s)
        ),
        'zeroStock', json_build_object(
          'count', (SELECT count(*) FROM parts WHERE stock<=0),
          'severity', 'info',
          'sample_ids', (SELECT coalesce(array_agg(id), '{}'::uuid[]) FROM (
            SELECT id FROM parts WHERE stock<=0 LIMIT 50) s)
        )
      )
    )
  ) INTO result;

  RETURN result;
END;
$function$;