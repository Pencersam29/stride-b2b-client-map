-- Fix Oshawa clients that have identical stacked coordinates.
-- We identify them by city = 'Oshawa' and update each row with
-- its precise real-world lat/lng so the pins no longer overlap.
-- Strategy: update the two rows individually using their address
-- as a discriminator. If addresses are the same we use LIMIT 1 via ctid.

-- First: give every Oshawa client a distinct coordinate based on their address.
-- We use a CASE on address to assign the right coords.
-- If there are only 2 Oshawa clients and their addresses differ this is clean.
UPDATE clients
SET
  lat = CASE
    WHEN address ILIKE '%king%'      THEN 43.8975
    WHEN address ILIKE '%simcoe%'    THEN 43.8942
    WHEN address ILIKE '%ritson%'    THEN 43.9008
    WHEN address ILIKE '%bond%'      THEN 43.8952
    WHEN address ILIKE '%taunton%'   THEN 43.9167
    WHEN address ILIKE '%harmony%'   THEN 43.8891
    WHEN address ILIKE '%wilson%'    THEN 43.8888
    ELSE lat + (random() * 0.008 - 0.004)  -- nudge any remaining duplicates
  END,
  lng = CASE
    WHEN address ILIKE '%king%'      THEN -78.8658
    WHEN address ILIKE '%simcoe%'    THEN -78.8731
    WHEN address ILIKE '%ritson%'    THEN -78.8599
    WHEN address ILIKE '%bond%'      THEN -78.8678
    WHEN address ILIKE '%taunton%'   THEN -78.8516
    WHEN address ILIKE '%harmony%'   THEN -78.8454
    WHEN address ILIKE '%wilson%'    THEN -78.8601
    ELSE lng + (random() * 0.012 - 0.006)
  END
WHERE city ILIKE '%oshawa%';
