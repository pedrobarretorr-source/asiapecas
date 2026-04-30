
-- Add reviewed_at to parts
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS reviewed_at timestamptz DEFAULT NULL;

-- Function to find duplicate parts by similar description
CREATE OR REPLACE FUNCTION public.find_duplicate_parts()
RETURNS TABLE(
  material_a text,
  description_a text,
  stock_a integer,
  price_a numeric,
  material_b text,
  description_b text,
  stock_b integer,
  price_b numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    a.material as material_a,
    a.description as description_a,
    a.stock as stock_a,
    a.estimated_price as price_a,
    b.material as material_b,
    b.description as description_b,
    b.stock as stock_b,
    b.estimated_price as price_b
  FROM parts a
  JOIN parts b ON a.id < b.id
    AND a.description = b.description
    AND a.material != b.material
  ORDER BY a.description
  LIMIT 100;
$$;

-- Update dashboard stats to include sales cross-data
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
    'totalSales', (SELECT count(*) FROM sales),
    'totalSalesValue', (SELECT coalesce(sum(total_amount), 0) FROM sales WHERE status != 'cancelado'),
    'openTickets', (SELECT count(*) FROM after_sales WHERE status IN ('aberto', 'em andamento')),
    'totalProspects', (SELECT count(*) FROM prospects),
    'hotProspects', (SELECT count(*) FROM prospects WHERE score >= 70),
    'totalCustomers', (SELECT count(*) FROM customers),
    'recentSales', (
      SELECT coalesce(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT s.id, s.order_number, s.total_amount, s.status, s.sale_date,
               c.name as customer_name
        FROM sales s LEFT JOIN customers c ON s.customer_id = c.id
        ORDER BY s.sale_date DESC LIMIT 5
      ) t
    ),
    'salesByMonth', (
      SELECT coalesce(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT to_char(sale_date, 'YYYY-MM') as month,
               count(*) as count,
               coalesce(sum(total_amount), 0) as value
        FROM sales WHERE status != 'cancelado'
        GROUP BY to_char(sale_date, 'YYYY-MM')
        ORDER BY month DESC LIMIT 12
      ) t
    ),
    'neverSoldCount', (
      SELECT count(*) FROM parts p
      WHERE NOT EXISTS (SELECT 1 FROM sale_items si WHERE si.part_id = p.id)
    ),
    'duplicateCount', (
      SELECT count(*) FROM (
        SELECT description FROM parts GROUP BY description HAVING count(*) > 1
      ) sub
    ),
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
