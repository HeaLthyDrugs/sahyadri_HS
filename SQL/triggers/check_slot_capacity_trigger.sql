CREATE
 
TRIGGER
 "check_slot_capacity_trigger"
BEFORE UPDATE 
OR
 
INSERT

ON
 "public"."participants"
FOR
 
EACH
 
ROW

EXECUTE
 
FUNCTION
 "public"."check_slot_capacity"();