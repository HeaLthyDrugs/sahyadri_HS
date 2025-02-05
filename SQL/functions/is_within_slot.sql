
BEGIN
    RETURN check_time >= slot_start AND check_time <= slot_end;
END;
