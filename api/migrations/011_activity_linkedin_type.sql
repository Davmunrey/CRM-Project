-- Add 'linkedin' as a valid activity type (frontend uses it)
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_type_check;
ALTER TABLE activities ADD CONSTRAINT activities_type_check
  CHECK (type = ANY (ARRAY['call','email','meeting','task','note','demo','follow_up','linkedin']));
