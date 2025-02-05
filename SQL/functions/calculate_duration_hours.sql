
BEGIN
    RETURN EXTRACT(EPOCH FROM (end_time - start_time)) / 3600.0;
END;
