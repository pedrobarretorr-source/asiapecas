
CREATE OR REPLACE FUNCTION public.get_stock_analytics()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
    'dataHealth', json_build_object(
      'noManufacturer', (SELECT count(*) FROM parts WHERE manufacturer IS NULL OR manufacturer=''),
      'noModel', (SELECT count(*) FROM parts WHERE machine_model IS NULL OR machine_model=''),
      'noCategory', (SELECT count(*) FROM parts WHERE part_category IS NULL OR part_category=''),
      'shortDescription', (SELECT count(*) FROM parts WHERE length(description)<10),
      'duplicateGroups', (SELECT count(*) FROM (SELECT description FROM parts GROUP BY description HAVING count(*)>1) s),
      'zeroPrice', (SELECT count(*) FROM parts WHERE estimated_price<=0),
      'zeroStock', (SELECT count(*) FROM parts WHERE stock<=0)
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_stock_analytics() TO authenticated, anon;
