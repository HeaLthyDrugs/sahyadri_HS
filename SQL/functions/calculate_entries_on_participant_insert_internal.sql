
DECLARE
    program_record RECORD;
    rule_record RECORD;
    curr_date DATE;
    entry_quantity INTEGER;
    duration_hours FLOAT;
BEGIN
    -- Get program details
    SELECT * INTO program_record 
    FROM programs 
    WHERE id = participant.program_id;

    -- Calculate duration for the participant's stay
    duration_hours := calculate_duration_hours(participant.reception_checkin, participant.reception_checkout);

    -- For each day of the participant's stay
    curr_date := DATE(participant.reception_checkin);
    WHILE curr_date <= DATE(participant.reception_checkout) LOOP
        -- For each product rule in the program's package
        FOR rule_record IN (
            SELECT pr.*, p.slot_start, p.slot_end, p.id as product_id
            FROM product_rules pr
            JOIN products p ON p.id = pr.product_id
            WHERE pr.package_id = program_record.package_id
        ) LOOP
            -- Check if the check-in time falls within the product's slot
            IF is_within_slot(
                CAST(participant.reception_checkin::time AS time),
                rule_record.slot_start,
                rule_record.slot_end
            ) THEN
                -- Calculate quantity based on allocation type
                CASE rule_record.allocation_type
                    WHEN 'per_day' THEN
                        entry_quantity := rule_record.quantity;
                    WHEN 'per_stay' THEN
                        IF curr_date = DATE(participant.reception_checkin) THEN
                            entry_quantity := rule_record.quantity;
                        ELSE
                            entry_quantity := 0;
                        END IF;
                    WHEN 'per_hour' THEN
                        entry_quantity := CEIL(rule_record.quantity * duration_hours);
                    ELSE
                        entry_quantity := 0;
                END CASE;

                -- Insert or update billing entry
                INSERT INTO billing_entries (
                    id,
                    program_id,
                    package_id,
                    product_id,
                    entry_date,
                    quantity
                ) VALUES (
                    gen_random_uuid(),
                    participant.program_id,
                    program_record.package_id,
                    rule_record.product_id,
                    curr_date,
                    entry_quantity
                )
                ON CONFLICT (program_id, package_id, product_id, entry_date)
                DO UPDATE SET
                    quantity = billing_entries.quantity + EXCLUDED.quantity;
            END IF;
        END LOOP;
        
        curr_date := curr_date + INTERVAL '1 day';
    END LOOP;
END;
