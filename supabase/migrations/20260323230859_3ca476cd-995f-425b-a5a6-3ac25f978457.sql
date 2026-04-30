CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'totalParts', (SELECT count(*) FROM parts),
    'totalSkuRows', (SELECT count(*) FROM parts),
    'totalStock', (SELECT coalesce(sum(stock), 0) FROM parts),
    'totalValue', (SELECT coalesce(sum(stock::numeric * estimated_price), 0) FROM parts),
    'avgPrice', (SELECT coalesce(avg(estimated_price), 0) FROM parts),
    'maxPrice', (SELECT coalesce(max(estimated_price), 0) FROM parts),
    'minPrice', (SELECT coalesce(min(estimated_price), 0) FROM parts WHERE estimated_price > 0),
    'staleStock', (SELECT count(*) FROM parts WHERE last_entry_time = 'mais de 2 anos'),
    'staleValue', (SELECT coalesce(sum(stock::numeric * estimated_price), 0) FROM parts WHERE last_entry_time = 'mais de 2 anos'),
    'staleUnits', (SELECT coalesce(sum(stock), 0) FROM parts WHERE last_entry_time = 'mais de 2 anos'),
    'lowStockHighValue', (SELECT count(*) FROM parts WHERE stock < 5 AND estimated_price > 50000),
    'byCategory', (
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT
          unnest(ARRAY['Mineração','Linha Amarela','Perfuratriz','Caminhão Elétrico','Guindaste']) as name,
          unnest(ARRAY[
            (SELECT count(*) FROM parts WHERE is_mineracao),
            (SELECT count(*) FROM parts WHERE is_linha_amarela),
            (SELECT count(*) FROM parts WHERE is_perfuratriz),
            (SELECT count(*) FROM parts WHERE is_caminhao_eletrico),
            (SELECT count(*) FROM parts WHERE is_guindaste)
          ]) as quantidade,
          unnest(ARRAY[
            (SELECT coalesce(sum(stock), 0) FROM parts WHERE is_mineracao),
            (SELECT coalesce(sum(stock), 0) FROM parts WHERE is_linha_amarela),
            (SELECT coalesce(sum(stock), 0) FROM parts WHERE is_perfuratriz),
            (SELECT coalesce(sum(stock), 0) FROM parts WHERE is_caminhao_eletrico),
            (SELECT coalesce(sum(stock), 0) FROM parts WHERE is_guindaste)
          ]) as units,
          unnest(ARRAY[
            (SELECT coalesce(sum(stock::numeric * estimated_price), 0) FROM parts WHERE is_mineracao),
            (SELECT coalesce(sum(stock::numeric * estimated_price), 0) FROM parts WHERE is_linha_amarela),
            (SELECT coalesce(sum(stock::numeric * estimated_price), 0) FROM parts WHERE is_perfuratriz),
            (SELECT coalesce(sum(stock::numeric * estimated_price), 0) FROM parts WHERE is_caminhao_eletrico),
            (SELECT coalesce(sum(stock::numeric * estimated_price), 0) FROM parts WHERE is_guindaste)
          ]) as value
      ) t
    ),
    'byTime', (
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT last_entry_time as name, count(*) as quantidade, 
               coalesce(sum(stock), 0) as units,
               coalesce(sum(stock::numeric * estimated_price), 0) as value
        FROM parts 
        WHERE last_entry_time IS NOT NULL
        GROUP BY last_entry_time
        ORDER BY CASE last_entry_time
          WHEN '6 até 12 meses' THEN 1
          WHEN '1 ano até 2 anos' THEN 2
          WHEN 'mais de 2 anos' THEN 3
          ELSE 4
        END
      ) t
    ),
    'byManufacturer', (
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT manufacturer as name, count(*) as quantidade,
               coalesce(sum(stock), 0) as units,
               coalesce(sum(stock::numeric * estimated_price), 0) as value
        FROM parts
        WHERE manufacturer IS NOT NULL
        GROUP BY manufacturer
        ORDER BY value DESC
      ) t
    ),
    'topModels', (
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT machine_model as name, count(*) as quantidade,
               coalesce(sum(stock), 0) as units,
               coalesce(sum(stock::numeric * estimated_price), 0) as value
        FROM parts
        WHERE machine_model IS NOT NULL
        GROUP BY machine_model
        ORDER BY value DESC
        LIMIT 15
      ) t
    ),
    'criticalParts', (
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT material, description, stock, estimated_price, machine_model, last_entry_time
        FROM parts
        WHERE stock < 5 AND estimated_price > 50000
        ORDER BY estimated_price DESC
        LIMIT 20
      ) t
    ),
    'staleParts', (
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT material, description, stock, estimated_price, machine_model,
               stock::numeric * estimated_price as total_value
        FROM parts
        WHERE last_entry_time = 'mais de 2 anos'
        ORDER BY stock::numeric * estimated_price DESC
        LIMIT 20
      ) t
    )
  ) INTO result;
  RETURN result;
END;
$function$;