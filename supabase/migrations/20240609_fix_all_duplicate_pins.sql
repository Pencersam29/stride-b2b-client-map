-- Fix ALL clients that share identical coordinates (not just Oshawa).
-- For each group of clients at the same lat/lng (rounded to 3 decimal places),
-- spread them out in a small circle so every pin is individually clickable.
-- Each duplicate gets offset by ~200m in a radial pattern around the original point.

WITH duplicates AS (
  SELECT
    id,
    lat,
    lng,
    ROW_NUMBER() OVER (
      PARTITION BY ROUND(lat::numeric, 3), ROUND(lng::numeric, 3)
      ORDER BY id
    ) AS rn,
    COUNT(*) OVER (
      PARTITION BY ROUND(lat::numeric, 3), ROUND(lng::numeric, 3)
    ) AS total
  FROM clients
),
to_update AS (
  SELECT
    id,
    lat,
    lng,
    rn,
    total,
    -- Spread in a circle: angle = (rn-1) / total * 360 degrees
    -- radius ~0.002 degrees (~200m)
    lat + 0.002 * cos(radians((rn - 1)::float / total * 360)) AS new_lat,
    lng + 0.003 * sin(radians((rn - 1)::float / total * 360)) AS new_lng
  FROM duplicates
  WHERE total > 1
)
UPDATE clients c
SET
  lat = tu.new_lat,
  lng = tu.new_lng
FROM to_update tu
WHERE c.id = tu.id;
