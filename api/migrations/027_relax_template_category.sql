-- 027: Relax the email_templates.category CHECK so UI-created templates persist.
--
-- The template builder offers categories 'intro'/'closing'/'nurture'/'custom',
-- but the original CHECK only allowed 'outreach'/'follow_up'/'proposal'/
-- 'onboarding'/'general', so creating/editing a template from the UI failed the
-- constraint (and the store swallowed the 400, losing the row on reload).
-- Replace the constraint with the union of both sets so legacy rows stay valid
-- and the UI's categories are accepted. (templates.ts zod enum matches this set.)

DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'email_templates'::regclass AND contype = 'c'
  LOOP
    EXECUTE 'ALTER TABLE email_templates DROP CONSTRAINT ' || quote_ident(c);
  END LOOP;
END $$;

ALTER TABLE email_templates
  ADD CONSTRAINT email_templates_category_check
  CHECK (category IN (
    'outreach', 'follow_up', 'proposal', 'onboarding', 'general',
    'intro', 'closing', 'nurture', 'custom'
  ));
