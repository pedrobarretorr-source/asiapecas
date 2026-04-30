-- Function to get distinct values for a column efficiently
CREATE OR REPLACE FUNCTION public.get_distinct_values(col_name text, stock_min int DEFAULT 0)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result text[];
BEGIN
  IF col_name = 'manufacturer' THEN
    SELECT array_agg(DISTINCT manufacturer ORDER BY manufacturer)
    INTO result
    FROM parts
    WHERE manufacturer IS NOT NULL AND stock >= stock_min;
  ELSIF col_name = 'machine_model' THEN
    SELECT array_agg(DISTINCT machine_model ORDER BY machine_model)
    INTO result
    FROM parts
    WHERE machine_model IS NOT NULL AND stock >= stock_min;
  ELSE
    result := '{}';
  END IF;
  RETURN COALESCE(result, '{}');
END;
$$;