
DECLARE
    package_id uuid;
BEGIN
    -- Get the appropriate package based on time slots
    SELECT p.id INTO package_id
    FROM packages p
    JOIN products pr ON pr.package_id = p.id
    WHERE check_time >= pr.slot_start AND check_time <= pr.slot_end
    LIMIT 1;

    RETURN package_id;
END;
