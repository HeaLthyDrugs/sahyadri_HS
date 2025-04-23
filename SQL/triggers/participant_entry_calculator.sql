DROP TRIGGER IF EXISTS "participant_entry_calculator" ON "public"."participants";

CREATE TRIGGER "participant_entry_calculator" AFTER DELETE
OR INSERT
OR
UPDATE ON "public"."participants" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_entries_for_participant" ();