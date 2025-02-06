CREATE
 
TRIGGER
 "participant_entry_calculator"
AFTER 
INSERT
 
OR
 
DELETE
 
OR
 UPDATE
ON
 "public"."participants"
FOR
 
EACH
 
ROW

EXECUTE
 
FUNCTION
 "public"."calculate_entries_for_participant"();