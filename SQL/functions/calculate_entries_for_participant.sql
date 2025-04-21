CREATE 
OR REPLACE FUNCTION public.calculate_entries_for_participant() RETURNS trigger LANGUAGE plpgsql AS $function$ 
DECLARE 
  program_record programs%ROWTYPE;
  product_record products%ROWTYPE;
  normal_package_id UUID;
  catering_package_id UUID;
  check_date DATE;
  entry_exists INTEGER;
  program_id UUID;
  participant_start_date DATE;
  participant_end_date DATE;
  affected_dates DATE[];
  slot_start timestamp;
  slot_end timestamp;
  checkin_time timestamp;
  checkout_time timestamp;
  should_count boolean;
  total_program_participants INTEGER;
BEGIN 
  -- Get the package IDs
  SELECT id INTO normal_package_id 
  FROM packages 
  WHERE type = 'Normal' 
  LIMIT 1;
  
  -- Get the catering package ID specifically
  SELECT id INTO catering_package_id 
  FROM packages 
  WHERE id = '3e46279d-c2ff-4bb6-ab0d-935e32ed7820'  
  LIMIT 1;
  
  -- If no package exists, exit
  IF normal_package_id IS NULL AND catering_package_id IS NULL THEN 
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
  
  -- Get the total number of participants in the program for validation
  SELECT COUNT(*) INTO total_program_participants
  FROM participants p
  WHERE p.program_id = program_record.id;
  
  -- For UPDATE operations, collect all affected dates
  IF TG_OP = 'UPDATE' THEN 
    -- Skip if check-in or check-out is missing in either OLD or NEW
    IF (OLD.reception_checkin IS NULL OR OLD.reception_checkout IS NULL) AND
       (NEW.reception_checkin IS NULL OR NEW.reception_checkout IS NULL) THEN
      RETURN NEW;
    END IF;
    
    -- Get all dates that need to be recalculated
    WITH date_range AS (
      SELECT generate_series(
        LEAST(
          COALESCE(DATE(OLD.reception_checkin), DATE(NEW.reception_checkin)), 
          COALESCE(DATE(NEW.reception_checkin), DATE(OLD.reception_checkin))
        ), 
        GREATEST(
          COALESCE(DATE(OLD.reception_checkout), DATE(NEW.reception_checkout)), 
          COALESCE(DATE(NEW.reception_checkout), DATE(OLD.reception_checkout))
        ), 
        '1 day'::interval
      )::date as date
    ) 
    SELECT array_agg(date) INTO affected_dates 
    FROM date_range;
    
    -- First, remove all entries for affected dates for both package types
    DELETE FROM billing_entries be 
    WHERE be.program_id = program_record.id 
      AND (be.package_id = normal_package_id OR be.package_id = catering_package_id)
      AND be.entry_date = ANY(affected_dates);
    
    -- Recalculate entries for all participants on affected dates
    -- Normal package
    IF normal_package_id IS NOT NULL THEN
      FOREACH check_date IN ARRAY affected_dates LOOP
        FOR product_record IN (
          SELECT p.* 
          FROM products p 
          WHERE p.package_id = normal_package_id 
          ORDER BY p.slot_start
        ) LOOP
          -- Set slot times for current date
          slot_start := check_date + product_record.slot_start::time;
          slot_end := check_date + product_record.slot_end::time;
          
          -- Handle overnight slots
          IF product_record.slot_end::time < product_record.slot_start::time THEN 
            slot_end := slot_end + INTERVAL '1 day';
          END IF;
          
          -- Count participants who were present during this slot for this specific date
          INSERT INTO billing_entries (id, program_id, package_id, product_id, entry_date, quantity) 
          SELECT 
            gen_random_uuid(), 
            program_record.id, 
            normal_package_id, 
            product_record.id, 
            check_date, 
            LEAST(COUNT(DISTINCT p.id), total_program_participants)
          FROM participants p
          WHERE p.program_id = program_record.id 
            AND p.reception_checkin IS NOT NULL 
            AND p.reception_checkout IS NOT NULL
            -- Participant must check-in before slot ends on the specific date
            AND p.reception_checkin < slot_end
            -- Participant must check-out after slot begins on the specific date
            AND p.reception_checkout > slot_start
            -- Participant must be checked in on or before the current date
            AND DATE(p.reception_checkin) <= check_date
            -- Participant must be checked out on or after the current date
            AND DATE(p.reception_checkout) >= check_date
          GROUP BY program_record.id, product_record.id
          HAVING COUNT(DISTINCT p.id) > 0;
        END LOOP;
      END LOOP;
    END IF;
    
    -- Catering package
    IF catering_package_id IS NOT NULL THEN
      FOREACH check_date IN ARRAY affected_dates LOOP
        FOR product_record IN (
          SELECT p.* 
          FROM products p 
          WHERE p.package_id = catering_package_id
          ORDER BY p.slot_start
        ) LOOP
          -- Set slot times for current date
          slot_start := check_date + product_record.slot_start::time;
          slot_end := check_date + product_record.slot_end::time;
          
          -- Handle overnight slots
          IF product_record.slot_end::time < product_record.slot_start::time THEN 
            slot_end := slot_end + INTERVAL '1 day';
          END IF;
          
          -- Count participants who were present during this slot for this specific date
          INSERT INTO billing_entries (id, program_id, package_id, product_id, entry_date, quantity) 
          SELECT 
            gen_random_uuid(), 
            program_record.id, 
            catering_package_id, 
            product_record.id, 
            check_date, 
            LEAST(COUNT(DISTINCT p.id), total_program_participants)
          FROM participants p
          WHERE p.program_id = program_record.id 
            AND p.reception_checkin IS NOT NULL 
            AND p.reception_checkout IS NOT NULL
            -- Participant must check-in before slot ends on the specific date
            AND p.reception_checkin < slot_end
            -- Participant must check-out after slot begins on the specific date
            AND p.reception_checkout > slot_start
            -- Participant must be checked in on or before the current date
            AND DATE(p.reception_checkin) <= check_date
            -- Participant must be checked out on or after the current date
            AND DATE(p.reception_checkout) >= check_date
          GROUP BY program_record.id, product_record.id
          HAVING COUNT(DISTINCT p.id) > 0;
        END LOOP;
      END LOOP;
    END IF;
    
  -- For INSERT operations
  ELSIF TG_OP = 'INSERT' THEN 
    -- Skip if check-in or check-out is missing
    IF NEW.reception_checkin IS NULL OR NEW.reception_checkout IS NULL THEN
      RETURN NEW;
    END IF;
    
    participant_start_date := DATE(NEW.reception_checkin);
    participant_end_date := DATE(NEW.reception_checkout);
    
    -- Create array of dates from check-in to check-out
    WITH date_range AS (
      SELECT generate_series(
        participant_start_date, 
        participant_end_date, 
        '1 day'::interval
      )::date as date
    ) 
    SELECT array_agg(date) INTO affected_dates 
    FROM date_range;
    
    -- Process each affected date
    FOREACH check_date IN ARRAY affected_dates LOOP
      -- Process normal package products
      IF normal_package_id IS NOT NULL THEN
        FOR product_record IN (
          SELECT p.* 
          FROM products p 
          WHERE p.package_id = normal_package_id 
          ORDER BY p.slot_start
        ) LOOP
          -- Set slot times for current date
          slot_start := check_date + product_record.slot_start::time;
          slot_end := check_date + product_record.slot_end::time;
          
          -- Handle overnight slots
          IF product_record.slot_end::time < product_record.slot_start::time THEN 
            slot_end := slot_end + INTERVAL '1 day';
          END IF;
          
          -- Check if participant was present during this slot on this specific date
          should_count := 
            NEW.reception_checkin < slot_end AND 
            NEW.reception_checkout > slot_start AND 
            DATE(NEW.reception_checkin) <= check_date AND 
            DATE(NEW.reception_checkout) >= check_date;
          
          -- If participant should be counted, update entry
          IF should_count THEN 
            -- Get the current count
            SELECT quantity INTO entry_exists 
            FROM billing_entries be 
            WHERE be.program_id = program_record.id 
              AND be.package_id = normal_package_id 
              AND be.product_id = product_record.id 
              AND be.entry_date = check_date;
            
            -- Update or insert entry, ensuring we don't exceed the total participants
            IF entry_exists IS NOT NULL THEN
              -- Only increment if we haven't reached the total participants
              IF entry_exists < total_program_participants THEN
                UPDATE billing_entries be 
                SET quantity = LEAST(quantity + 1, total_program_participants)
                WHERE be.program_id = program_record.id 
                  AND be.package_id = normal_package_id 
                  AND be.product_id = product_record.id 
                  AND be.entry_date = check_date;
              END IF;
            ELSE
              INSERT INTO billing_entries (id, program_id, package_id, product_id, entry_date, quantity) 
              VALUES (
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
      END IF;
      
      -- Process catering package products
      IF catering_package_id IS NOT NULL THEN
        FOR product_record IN (
          SELECT p.* 
          FROM products p 
          WHERE p.package_id = catering_package_id
          ORDER BY p.slot_start
        ) LOOP
          -- Set slot times for current date
          slot_start := check_date + product_record.slot_start::time;
          slot_end := check_date + product_record.slot_end::time;
          
          -- Handle overnight slots
          IF product_record.slot_end::time < product_record.slot_start::time THEN 
            slot_end := slot_end + INTERVAL '1 day';
          END IF;
          
          -- Check if participant was present during this slot on this specific date
          should_count := 
            NEW.reception_checkin < slot_end AND 
            NEW.reception_checkout > slot_start AND 
            DATE(NEW.reception_checkin) <= check_date AND 
            DATE(NEW.reception_checkout) >= check_date;
          
          -- If participant should be counted, update entry
          IF should_count THEN 
            -- Get the current count
            SELECT quantity INTO entry_exists 
            FROM billing_entries be 
            WHERE be.program_id = program_record.id 
              AND be.package_id = catering_package_id
              AND be.product_id = product_record.id 
              AND be.entry_date = check_date;
            
            -- Update or insert entry, ensuring we don't exceed the total participants
            IF entry_exists IS NOT NULL THEN
              -- Only increment if we haven't reached the total participants
              IF entry_exists < total_program_participants THEN
                UPDATE billing_entries be 
                SET quantity = LEAST(quantity + 1, total_program_participants)
                WHERE be.program_id = program_record.id 
                  AND be.package_id = catering_package_id
                  AND be.product_id = product_record.id 
                  AND be.entry_date = check_date;
              END IF;
            ELSE
              INSERT INTO billing_entries (id, program_id, package_id, product_id, entry_date, quantity) 
              VALUES (
                gen_random_uuid(), 
                program_record.id, 
                catering_package_id, 
                product_record.id, 
                check_date, 
                1
              );
            END IF;
          END IF;
        END LOOP;
      END IF;
    END LOOP;
    
  -- For DELETE operations
  ELSIF TG_OP = 'DELETE' THEN 
    -- Skip if check-in or check-out was missing
    IF OLD.reception_checkin IS NULL OR OLD.reception_checkout IS NULL THEN
      RETURN OLD;
    END IF;
    
    participant_start_date := DATE(OLD.reception_checkin);
    participant_end_date := DATE(OLD.reception_checkout);
    
    -- First, calculate affected dates
    WITH date_range AS (
      SELECT generate_series(
        participant_start_date, 
        participant_end_date, 
        '1 day'::interval
      )::date as date
    ) 
    SELECT array_agg(date) INTO affected_dates 
    FROM date_range;
    
    -- Process each affected date
    FOREACH check_date IN ARRAY affected_dates LOOP
      -- Process normal package products
      IF normal_package_id IS NOT NULL THEN
        FOR product_record IN (
          SELECT p.* 
          FROM products p 
          WHERE p.package_id = normal_package_id 
          ORDER BY p.slot_start
        ) LOOP
          -- Set slot times for current date
          slot_start := check_date + product_record.slot_start::time;
          slot_end := check_date + product_record.slot_end::time;
          
          -- Handle overnight slots
          IF product_record.slot_end::time < product_record.slot_start::time THEN 
            slot_end := slot_end + INTERVAL '1 day';
          END IF;
          
          -- Check if participant was present during this slot on this specific date
          should_count := 
            OLD.reception_checkin < slot_end AND 
            OLD.reception_checkout > slot_start AND 
            DATE(OLD.reception_checkin) <= check_date AND 
            DATE(OLD.reception_checkout) >= check_date;
          
          -- If participant should have been counted, update entry
          IF should_count THEN 
            -- Update quantity
            UPDATE billing_entries be 
            SET quantity = quantity - 1 
            WHERE be.program_id = program_record.id 
              AND be.package_id = normal_package_id 
              AND be.product_id = product_record.id 
              AND be.entry_date = check_date;
            
            -- Remove entries where quantity becomes 0 or negative
            DELETE FROM billing_entries be 
            WHERE be.program_id = program_record.id 
              AND be.package_id = normal_package_id 
              AND be.product_id = product_record.id 
              AND be.entry_date = check_date
              AND quantity <= 0;
          END IF;
        END LOOP;
      END IF;
      
      -- Process catering package products
      IF catering_package_id IS NOT NULL THEN
        FOR product_record IN (
          SELECT p.* 
          FROM products p 
          WHERE p.package_id = catering_package_id
          ORDER BY p.slot_start
        ) LOOP
          -- Set slot times for current date
          slot_start := check_date + product_record.slot_start::time;
          slot_end := check_date + product_record.slot_end::time;
          
          -- Handle overnight slots
          IF product_record.slot_end::time < product_record.slot_start::time THEN 
            slot_end := slot_end + INTERVAL '1 day';
          END IF;
          
          -- Check if participant was present during this slot on this specific date
          should_count := 
            OLD.reception_checkin < slot_end AND 
            OLD.reception_checkout > slot_start AND 
            DATE(OLD.reception_checkin) <= check_date AND 
            DATE(OLD.reception_checkout) >= check_date;
          
          -- If participant should have been counted, update entry
          IF should_count THEN 
            -- Update quantity
            UPDATE billing_entries be 
            SET quantity = quantity - 1 
            WHERE be.program_id = program_record.id 
              AND be.package_id = catering_package_id
              AND be.product_id = product_record.id 
              AND be.entry_date = check_date;
            
            -- Remove entries where quantity becomes 0 or negative
            DELETE FROM billing_entries be 
            WHERE be.program_id = program_record.id 
              AND be.package_id = catering_package_id
              AND be.product_id = product_record.id 
              AND be.entry_date = check_date
              AND quantity <= 0;
          END IF;
        END LOOP;
      END IF;
    END LOOP;
  END IF;
  
  IF TG_OP = 'DELETE' THEN 
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$function$