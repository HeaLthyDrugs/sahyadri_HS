-- Fix the foreign key constraint issue between participants and billing_entries

-- First, drop the existing trigger
DROP TRIGGER IF EXISTS participant_entry_calculator ON participants;

-- Drop the existing constraint
ALTER TABLE public.billing_entries
DROP CONSTRAINT IF EXISTS billing_entries_participant_id_fkey;

-- Add the constraint back with ON DELETE SET NULL
-- This allows participants to be deleted without violating the constraint
ALTER TABLE public.billing_entries
ADD CONSTRAINT billing_entries_participant_id_fkey
FOREIGN KEY (participant_id)
REFERENCES participants (id)
ON DELETE SET NULL;

-- Recreate the trigger as BEFORE trigger
-- This ensures the trigger runs before the actual deletion occurs
CREATE TRIGGER participant_entry_calculator
BEFORE DELETE OR INSERT OR UPDATE ON participants
FOR EACH ROW EXECUTE FUNCTION calculate_entries_for_participant();