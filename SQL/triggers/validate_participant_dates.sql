CREATE
 
TRIGGER
 "validate_participant_dates"
BEFORE 
INSERT
 
OR
 UPDATE
ON
 "public"."participants"
FOR
 
EACH
 
ROW

EXECUTE
 
FUNCTION
 "public"."validate_participant_dates"();