-- 028: Store record "owner" (assigned_to) as a display-name string, not a user-id FK.
--
-- The entire frontend treats assigned_to as a user's display NAME — the contact
-- and deal owner Selects submit `u.name`, the "my data" filter compares to
-- `currentUser.name`, list search includes the owner name, and detail views render
-- it directly. But contacts/deals/leads.assigned_to were `uuid REFERENCES users(id)`,
-- so creating/editing a record with an owner failed validation (400) and never
-- persisted. leads.assigned_to was already validated as a free string.
--
-- Align the schema with how the app actually uses the column: a text label.
-- (A future "owner-by-id" model would instead change the frontend to submit ids
-- and resolve id->name for display — deliberately not done here to avoid a broad,
-- regression-prone frontend refactor.)

-- Drop the FK constraint backing assigned_to on each table (match by column, so
-- a non-standard constraint name is still handled).
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT con.conname, con.conrelid::regclass::text AS tbl
    FROM pg_constraint con
    JOIN pg_attribute att
      ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
    WHERE con.contype = 'f'
      AND con.conrelid IN ('contacts'::regclass, 'deals'::regclass, 'leads'::regclass)
      AND att.attname = 'assigned_to'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', rec.tbl, rec.conname);
  END LOOP;
END $$;

ALTER TABLE contacts ALTER COLUMN assigned_to TYPE text USING assigned_to::text;
ALTER TABLE deals    ALTER COLUMN assigned_to TYPE text USING assigned_to::text;
ALTER TABLE leads    ALTER COLUMN assigned_to TYPE text USING assigned_to::text;
