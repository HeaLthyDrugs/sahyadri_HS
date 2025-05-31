-- Drop existing constraint first
ALTER TABLE public.billing_entries
DROP CONSTRAINT IF EXISTS billing_entries_participant_id_fkey;

-- Add the constraint back with ON DELETE CASCADE
ALTER TABLE public.billing_entries
ADD CONSTRAINT billing_entries_participant_id_fkey
FOREIGN KEY (participant_id)
REFERENCES participants (id)
ON DELETE CASCADE;

-- Recreate trigger with correct order
DROP TRIGGER IF EXISTS participant_entry_calculator ON participants;

CREATE TRIGGER participant_entry_calculator
BEFORE DELETE OR INSERT OR UPDATE ON participants
FOR EACH ROW EXECUTE FUNCTION calculate_entries_for_participant();
