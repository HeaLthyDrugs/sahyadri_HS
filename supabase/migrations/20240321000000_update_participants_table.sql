-- Drop existing foreign key constraints and indexes
ALTER TABLE IF EXISTS public.participants DROP CONSTRAINT IF EXISTS participants_program_id_fkey;
DROP INDEX IF EXISTS participants_created_at_idx;
DROP INDEX IF EXISTS participants_attendee_name_idx;

-- Drop columns we don't need anymore
ALTER TABLE public.participants DROP COLUMN IF EXISTS type;
ALTER TABLE public.participants DROP COLUMN IF EXISTS program_id;

-- Recreate the table with the new schema
ALTER TABLE public.participants 
  ALTER COLUMN attendee_name SET NOT NULL,
  ALTER COLUMN reception_checkin SET NOT NULL,
  ALTER COLUMN reception_checkout SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS participants_created_at_idx ON public.participants USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS participants_attendee_name_idx ON public.participants USING btree (attendee_name);

-- Add RLS policies
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.participants
    FOR SELECT
    USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.participants
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.participants
    FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON public.participants
    FOR DELETE
    USING (auth.role() = 'authenticated'); 