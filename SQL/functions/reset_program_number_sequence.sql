
BEGIN
    -- Get the sequence name
    PERFORM setval(
        pg_get_serial_sequence('programs', 'program_number'),
        1,
        false
    );
END;
