DROP TRIGGER IF EXISTS validate_participant_dates ON participants;

CREATE TRIGGER validate_participant_dates
    BEFORE INSERT OR UPDATE ON participants
    FOR EACH ROW
    EXECUTE FUNCTION validate_participant_dates(); 