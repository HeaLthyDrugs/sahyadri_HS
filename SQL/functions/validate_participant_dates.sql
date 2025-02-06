CREATE OR REPLACE FUNCTION validate_participant_dates()
RETURNS TRIGGER AS $$
BEGIN
    -- Basic validation for actual errors
    IF NEW.reception_checkout <= NEW.reception_checkin THEN
        NEW.has_date_error := true;
        NEW.date_error_message := 'Check-out time must be after check-in time';
        RAISE EXCEPTION 'Check-out time must be after check-in time';
    END IF;
    
    -- Reset error flags by default
    NEW.has_date_error := false;
    NEW.date_error_message := null;
    
    -- Check for early arrival or late departure (warnings only)
    IF NEW.program_id IS NOT NULL THEN
        SELECT 
            CASE 
                WHEN NEW.reception_checkin < p.start_date AND NEW.reception_checkout > p.end_date THEN
                    'Arrived ' || 
                    EXTRACT(DAY FROM p.start_date - NEW.reception_checkin)::text || 
                    ' days early, Left ' ||
                    EXTRACT(DAY FROM NEW.reception_checkout - p.end_date)::text ||
                    ' days after program end'
                WHEN NEW.reception_checkin < p.start_date THEN
                    'Arrived ' || 
                    EXTRACT(DAY FROM p.start_date - NEW.reception_checkin)::text || 
                    ' days early'
                WHEN NEW.reception_checkout > p.end_date THEN
                    'Left ' ||
                    EXTRACT(DAY FROM NEW.reception_checkout - p.end_date)::text ||
                    ' days after program end'
                ELSE
                    null
            END INTO NEW.date_error_message
        FROM programs p
        WHERE p.id = NEW.program_id
        AND (
            NEW.reception_checkin < p.start_date OR
            NEW.reception_checkout > p.end_date
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
