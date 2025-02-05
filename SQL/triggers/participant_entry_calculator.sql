CREATE TRIGGER "participant_entry_calculator" AFTER
UPDATE
OR DELETE
OR INSERT ON "public"."participants" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_entries_for_participant" ();