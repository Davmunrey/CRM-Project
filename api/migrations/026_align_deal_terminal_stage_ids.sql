-- 026: Align deal terminal stage ids with the app's canonical 'closed_won'/'closed_lost'.
--
-- The frontend (kanban/list/calendar/timeline, dealsStore, deal-health logic),
-- deals.ts status mapping, and analytics.ts all key off 'closed_won'/'closed_lost',
-- but the default pipeline seeded ids 'won'/'lost'. That mismatch meant won/lost
-- deals were never counted, Mark-Won/Lost made cards vanish, and win/loss
-- notifications/automations never fired. pipelines.ts now seeds 'closed_won'/
-- 'closed_lost'; this migration realigns any already-seeded data.

-- Existing deals carrying the old terminal stage ids.
UPDATE deals SET stage = 'closed_won'  WHERE stage = 'won';
UPDATE deals SET stage = 'closed_lost' WHERE stage = 'lost';

-- Existing pipeline stage definitions (jsonb array of {id,name,order,...}).
-- Rebuild each array, rewriting the terminal stage ids while preserving order.
UPDATE pipelines p
SET stages = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'id' = 'won'  THEN jsonb_set(elem, '{id}', '"closed_won"')
      WHEN elem->>'id' = 'lost' THEN jsonb_set(elem, '{id}', '"closed_lost"')
      ELSE elem
    END
    ORDER BY ord
  )
  FROM jsonb_array_elements(p.stages) WITH ORDINALITY AS t(elem, ord)
)
WHERE p.stages @> '[{"id":"won"}]' OR p.stages @> '[{"id":"lost"}]';
