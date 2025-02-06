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
    affected_dates DATE[];
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

    -- For UPDATE operations, collect all affected dates
    IF TG_OP = 'UPDATE' THEN
        -- Get all dates that need to be recalculated
        WITH date_range AS (
            SELECT generate_series(
                LEAST(DATE(OLD.reception_checkin), DATE(NEW.reception_checkin)),
                GREATEST(DATE(OLD.reception_checkout), DATE(NEW.reception_checkout)),
                '1 day'::interval
            )::date as date
        )
        SELECT array_agg(date) INTO affected_dates FROM date_range;

        -- First, remove all entries for affected dates
        DELETE FROM billing_entries be
        WHERE be.program_id = program_record.id
        AND be.package_id = normal_package_id
        AND be.entry_date = ANY(affected_dates);

        -- Recalculate entries for all participants on affected dates
        INSERT INTO billing_entries (
            id,
            program_id,
            package_id,
            product_id,
            entry_date,
            quantity
        )
        SELECT 
            gen_random_uuid(),
            program_record.id,
            normal_package_id,
            pr.id as product_id,
            d.date as entry_date,
            COUNT(DISTINCT p.id) as quantity
        FROM 
            unnest(affected_dates) as d(date)
            CROSS JOIN products pr
            LEFT JOIN participants p ON 
                p.program_id = program_record.id
                AND DATE(p.reception_checkin) <= d.date
                AND DATE(p.reception_checkout) >= d.date
                AND (
                    -- For check-in day
                    (DATE(p.reception_checkin) = d.date AND 
                     (d.date + pr.slot_end::time) > p.reception_checkin AND
                     (
                         -- For slots that span across midnight
                         (pr.slot_end::time < pr.slot_start::time AND
                          ((d.date + pr.slot_start::time) <= p.reception_checkin OR
                           ((d.date + INTERVAL '1 day')::timestamp + pr.slot_end::time) > p.reception_checkin))
                         OR
                         -- For normal slots
                         (pr.slot_end::time >= pr.slot_start::time AND
                          (d.date + pr.slot_start::time) <= p.reception_checkin)
                     ))
                    OR
                    -- For check-out day
                    (DATE(p.reception_checkout) = d.date AND 
                     (d.date + pr.slot_start::time) < p.reception_checkout AND
                     (
                         -- For slots that span across midnight
                         (pr.slot_end::time < pr.slot_start::time AND
                          ((d.date + pr.slot_start::time) < p.reception_checkout OR
                           ((d.date + INTERVAL '1 day')::timestamp + pr.slot_end::time) >= p.reception_checkout))
                         OR
                         -- For normal slots
                         (pr.slot_end::time >= pr.slot_start::time AND
                          (d.date + pr.slot_end::time) >= p.reception_checkout)
                     ))
                    OR
                    -- For days in between
                    (DATE(p.reception_checkin) < d.date AND 
                     DATE(p.reception_checkout) > d.date)
                )
        WHERE 
            pr.package_id = normal_package_id
        GROUP BY 
            pr.id,
            d.date;

    -- For INSERT operations
    ELSIF TG_OP = 'INSERT' THEN
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
                    
                    -- Handle overnight slots
                    IF product_record.slot_end::time < product_record.slot_start::time THEN
                        slot_end := slot_end + INTERVAL '1 day';
                    END IF;

                    -- Set check-in/out times for comparison
                    checkin_time := NEW.reception_checkin;
                    checkout_time := NEW.reception_checkout;

                    -- Determine if this slot should be counted
                    IF check_date = participant_start_date THEN
                        -- For check-in day, only count if:
                        -- 1. Slot ends after check-in time AND
                        -- 2. For overnight slots, either starts before check-in or ends after check-in
                        -- 3. For normal slots, starts before check-in
                        should_count := slot_end > checkin_time AND
                            (
                                (product_record.slot_end::time < product_record.slot_start::time AND
                                 (slot_start <= checkin_time OR slot_end > checkin_time))
                                OR
                                (product_record.slot_end::time >= product_record.slot_start::time AND
                                 slot_start <= checkin_time)
                            );
                    ELSIF check_date = participant_end_date THEN
                        -- For check-out day, only count if:
                        -- 1. Slot starts before check-out time AND
                        -- 2. For overnight slots, either starts before check-out or ends after check-out
                        -- 3. For normal slots, ends after check-out
                        should_count := slot_start < checkout_time AND
                            (
                                (product_record.slot_end::time < product_record.slot_start::time AND
                                 (slot_start < checkout_time OR slot_end >= checkout_time))
                                OR
                                (product_record.slot_end::time >= product_record.slot_start::time AND
                                 slot_end >= checkout_time)
                            );
                    ELSE
                        -- For full days in between
                        should_count := true;
                    END IF;

                    -- If slot should be counted, update entry
                    IF should_count THEN
                        -- Update or insert entry
                        UPDATE billing_entries be
                        SET quantity = quantity + 1
                        WHERE be.program_id = program_record.id
                        AND be.package_id = normal_package_id
                        AND be.product_id = product_record.id
                        AND be.entry_date = check_date;

                        -- If no row was updated, insert new entry
                        IF NOT FOUND THEN
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

    -- For DELETE operations
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement quantities for the deleted participant
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