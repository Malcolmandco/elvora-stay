-- RPC function to get destinations with their Hotelbeds property counts
-- Used by the admin sync dashboard
CREATE OR REPLACE FUNCTION get_destinations_with_hb_counts()
RETURNS TABLE (
  id TEXT,
  name TEXT,
  slug TEXT,
  country TEXT,
  hb_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    d.id,
    d.name,
    d.slug,
    d.country,
    COALESCE((
      SELECT COUNT(*) 
      FROM properties p 
      WHERE p.destination_id = d.id 
        AND p.supplier_name = 'hotelbeds'
        AND p.is_active = true
    ), 0) AS hb_count
  FROM destinations d
  ORDER BY d.name;
$$;

GRANT EXECUTE ON FUNCTION get_destinations_with_hb_counts() TO authenticated;
