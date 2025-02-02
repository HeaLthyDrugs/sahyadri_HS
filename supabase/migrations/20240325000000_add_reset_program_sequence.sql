-- Function to reset program_number sequence
CREATE OR REPLACE FUNCTION reset_program_number_sequence()
RETURNS void AS $$
BEGIN
    -- Get the sequence name
    PERFORM setval(
        pg_get_serial_sequence('programs', 'program_number'),
        1,
        false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION reset_program_number_sequence() TO authenticated; 