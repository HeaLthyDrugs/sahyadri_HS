-- Trigger to automatically calculate billing entries
-- Only processes participants with type 'participant'
-- Guests, drivers, and other types are excluded from billing calculations
DROP TRIGGER IF EXISTS "participant_entry_calculator" ON "public"."participants";

CREATE TRIGGER "participant_entry_calculator"
AFTER UPDATE OR INSERT OR DELETE
ON "public"."participants"
FOR EACH ROW
EXECUTE FUNCTION "public"."calculate_entries_for_participant"();