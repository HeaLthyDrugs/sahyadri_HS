-- Function to calculate entries when a participant is inserted/updated/deleted
CREATE OR REPLACE FUNCTION calculate_entries_for_participant()
RETURNS TRIGGER AS $$
DECLARE
    program_record RECORD;
    product_record RECORD;
    normal_package_id UUID;
    check_date DATE;
    time_of_day TIMESTAMP;
    entry_exists INTEGER;
    program_id UUID;
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
    SELECT p.* INTO program_record 
    FROM programs p
    WHERE p.id = program_id;

    -- If no program found, exit
    IF program_record IS NULL THEN
        RETURN NULL;
    END IF;

    -- Handle INSERT or UPDATE
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        -- Loop through each date between check-in and check-out
        check_date := DATE(NEW.reception_checkin);
        WHILE check_date <= DATE(NEW.reception_checkout) LOOP
            -- For each product in the normal package
            FOR product_record IN (
                SELECT p.* 
                FROM products p
                WHERE p.package_id = normal_package_id
                ORDER BY p.slot_start
            ) LOOP
                -- Create timestamp for product's time slot on current date
                time_of_day := check_date + product_record.slot_start;
                
                -- Check if participant was present during the product's time slot
                IF (NEW.reception_checkin <= time_of_day AND 
                    NEW.reception_checkout >= time_of_day) THEN
                    
                    -- Check if entry already exists
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
                        -- If entry doesn't exist, create new entry with generated UUID
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
            END LOOP;
            
            check_date := check_date + INTERVAL '1 day';
        END LOOP;
    END IF;

    -- Handle DELETE or UPDATE (old record)
    IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
        -- Loop through each date between check-in and check-out
        check_date := DATE(OLD.reception_checkin);
        WHILE check_date <= DATE(OLD.reception_checkout) LOOP
            -- For each product in the normal package
            FOR product_record IN (
                SELECT p.* 
                FROM products p
                WHERE p.package_id = normal_package_id
                ORDER BY p.slot_start
            ) LOOP
                -- Create timestamp for product's time slot on current date
                time_of_day := check_date + product_record.slot_start;
                
                -- Check if participant was present during the product's time slot
                IF (OLD.reception_checkin <= time_of_day AND 
                    OLD.reception_checkout >= time_of_day) THEN
                    
                    -- Decrement quantity
                    UPDATE billing_entries be
                    SET quantity = quantity - 1
                    WHERE be.program_id = program_record.id
                    AND be.package_id = normal_package_id
                    AND be.product_id = product_record.id
                    AND be.entry_date = check_date
                    AND quantity > 0;

                    -- Delete entry if quantity becomes 0
                    DELETE FROM billing_entries be
                    WHERE be.program_id = program_record.id
                    AND be.package_id = normal_package_id
                    AND be.product_id = product_record.id
                    AND be.entry_date = check_date
                    AND quantity <= 0;
                END IF;
            END LOOP;
            
            check_date := check_date + INTERVAL '1 day';
        END LOOP;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS participant_entry_calculator ON participants;

-- Create triggers for INSERT, UPDATE, and DELETE operations
CREATE TRIGGER participant_entry_calculator
    AFTER INSERT OR UPDATE OR DELETE ON participants
    FOR EACH ROW
    EXECUTE FUNCTION calculate_entries_for_participant();
