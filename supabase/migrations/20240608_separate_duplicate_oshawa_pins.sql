-- Separate any Oshawa clients that ended up with identical lat/lng.
-- For each duplicate group, keep the first row as-is and offset each
-- subsequent row by a small but visible amount (~150m apart).
WITH ranked AS (
  SELECT
    id,
    lat,
    lng,
    ROW_NUMBER() OVER (PARTITION BY ROUND(lat::numeric, 4), ROUND(lng::numeric, 4) ORDER BY id) AS rn
  FROM clients
  WHERE city ILIKE '%oshawa%'
)
UPDATE clients c
SET
  lat = c.lat + (r.rn - 1) * 0.0014,   -- ~150m north per duplicate rank
  lng = c.lng + (r.rn - 1) * 0.0020    -- ~150m east per duplicate rank
FROM ranked r
WHERE c.id = r.id
  AND r.rn > 1;
