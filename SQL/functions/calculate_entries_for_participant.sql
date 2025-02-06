CREATE OR REPLACE FUNCTION calculate_entries_for_participant()
RETURNS TRIGGER AS $$
DECLARE
    program_record programs%ROWTYPE;
    product_record products%ROWTYPE;
    normal_package_id UUID;
    check_date DATE;
    entry_exists INTEGER;
    program_id UUID;
    participant_start_date DATE;
    participant_end_date DATE;
BEGIN
    -- Get the normal package ID
    SELECT id INTO normal_package_id 
    FROM packages 
    WHERE type = 'Normal' 
    LIMIT 1;

    -- If no normal package exists, exit
    IF normal_package_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Get program ID based on operation type
    IF TG_OP = 'DELETE' THEN
        program_id := OLD.program_id;
    ELSE
        program_id := NEW.program_id;
    END IF;

    -- Get program details
    SELECT * INTO program_record 
    FROM programs p
    WHERE p.id = program_id;

    -- If no program found, exit
    IF program_record IS NULL THEN
        RETURN NULL;
    END IF;

    -- Handle INSERT or UPDATE
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        -- Use participant's actual dates
        participant_start_date := DATE(NEW.reception_checkin);
        participant_end_date := DATE(NEW.reception_checkout);

        -- Loop through each date
        check_date := participant_start_date;
        WHILE check_date <= participant_end_date LOOP
            -- For each product in the normal package
            FOR product_record IN (
                SELECT p.* 
                FROM products p
                WHERE p.package_id = normal_package_id
                ORDER BY p.slot_start
            ) LOOP
                DECLARE
                    slot_start timestamp;
                    slot_end timestamp;
                    checkin_time timestamp;
                    checkout_time timestamp;
                    should_count boolean := false;
                BEGIN
                    -- Set slot times for current date
                    slot_start := check_date + product_record.slot_start::time;
                    slot_end := check_date + product_record.slot_end::time;
                    
                    -- Handle overnight slots (when end time is less than start time)
                    IF product_record.slot_end::time < product_record.slot_start::time THEN
                        slot_end := slot_end + INTERVAL '1 day';
                    END IF;

                    -- Set check-in/out times for comparison
                    checkin_time := NEW.reception_checkin;
                    checkout_time := NEW.reception_checkout;

                    -- Determine if this slot should be counted
                    IF check_date = participant_start_date THEN
                        -- On check-in day:
                        -- 1. For slots that end before check-in time: Don't count
                        -- 2. For slots that start before but end after check-in time: Count
                        -- 3. For slots that start after check-in time: Count
                        should_count := slot_end > checkin_time;
                    ELSIF check_date = participant_end_date THEN
                        -- On check-out day:
                        -- 1. For slots that start after check-out time: Don't count
                        -- 2. For slots that start before but end after check-out time: Count
                        -- 3. For slots that end before check-out time: Count
                        should_count := slot_start < checkout_time;
                    ELSE
                        -- For full days in between, count all slots
                        should_count := true;
                    END IF;

                    -- If slot should be counted, create or update entry
                    IF should_count THEN
                        -- Check if entry exists
                        SELECT COUNT(*) INTO entry_exists
                        FROM billing_entries be
                        WHERE be.program_id = program_record.id
                        AND be.package_id = normal_package_id
                        AND be.product_id = product_record.id
                        AND be.entry_date = check_date;

                        -- If entry exists, increment quantity
                        IF entry_exists > 0 THEN
                            UPDATE billing_entries be
                            SET quantity = quantity + 1
                            WHERE be.program_id = program_record.id
                            AND be.package_id = normal_package_id
                            AND be.product_id = product_record.id
                            AND be.entry_date = check_date;
                        ELSE
                            -- If entry doesn't exist, create new entry
                            INSERT INTO billing_entries (
                                id,
                                program_id,
                                package_id,
                                product_id,
                                entry_date,
                                quantity
                            ) VALUES (
                                gen_random_uuid(),
                                program_record.id,
                                normal_package_id,
                                product_record.id,
                                check_date,
                                1
                            );
                        END IF;
                    END IF;
                END;
            END LOOP;
            check_date := check_date + INTERVAL '1 day';
        END LOOP;
    END IF;

    -- Handle DELETE or UPDATE (old record cleanup)
    IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
        -- Delete or decrement old entries
        UPDATE billing_entries be
        SET quantity = quantity - 1
        WHERE be.program_id = program_record.id
        AND be.package_id = normal_package_id
        AND be.entry_date BETWEEN DATE(OLD.reception_checkin) AND DATE(OLD.reception_checkout);

        -- Remove entries where quantity becomes 0
        DELETE FROM billing_entries be
        WHERE be.program_id = program_record.id
        AND be.package_id = normal_package_id
        AND be.entry_date BETWEEN DATE(OLD.reception_checkin) AND DATE(OLD.reception_checkout)
        AND quantity <= 0;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;