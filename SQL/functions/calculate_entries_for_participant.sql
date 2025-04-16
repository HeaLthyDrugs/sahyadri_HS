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
  
  -- If no normal package exists, exit
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
    SELECT array_agg(date) INTO affected_dates 
    FROM date_range;
    
    -- First, remove all entries for affected dates for both package types
    DELETE FROM billing_entries be 
    WHERE be.program_id = program_record.id 
      AND (be.package_id = normal_package_id OR be.package_id = catering_package_id)
      AND be.entry_date = ANY(affected_dates);
    
    -- Recalculate entries for all participants on affected dates for normal package
    IF normal_package_id IS NOT NULL THEN
      INSERT INTO billing_entries (id, program_id, package_id, product_id, entry_date, quantity) 
      SELECT 
        gen_random_uuid(), 
        program_record.id, 
        normal_package_id, 
        pr.id as product_id, 
        d.date as entry_date, 
        COUNT(DISTINCT p.id) as quantity 
      FROM unnest(affected_dates) as d(date) 
      CROSS JOIN products pr 
      LEFT JOIN participants p ON p.program_id = program_record.id 
        AND DATE(p.reception_checkin) <= d.date 
        AND DATE(p.reception_checkout) >= d.date 
        AND (
          -- For full days between check-in/check-out
          (DATE(p.reception_checkin) < d.date AND DATE(p.reception_checkout) > d.date)
          OR
          -- For check-in day, only count products whose slots start after check-in time or overlap
          (DATE(p.reception_checkin) = d.date AND 
            (p.reception_checkin <= (d.date + pr.slot_start::time) OR 
             (pr.slot_start::time <= pr.slot_end::time AND 
              p.reception_checkin > (d.date + pr.slot_start::time) AND 
              p.reception_checkin < (d.date + pr.slot_end::time))))
          OR
          -- For check-out day, only count products whose slots end before check-out time or overlap
          (DATE(p.reception_checkout) = d.date AND 
            (p.reception_checkout >= (d.date + pr.slot_end::time) OR 
             (pr.slot_start::time <= pr.slot_end::time AND 
              p.reception_checkout > (d.date + pr.slot_start::time) AND 
              p.reception_checkout < (d.date + pr.slot_end::time))))
        ) 
      WHERE pr.package_id = normal_package_id 
      GROUP BY pr.id, d.date
      HAVING COUNT(DISTINCT p.id) > 0;
    END IF;
    
    -- Recalculate entries for all participants on affected dates for catering package
    IF catering_package_id IS NOT NULL THEN
      INSERT INTO billing_entries (id, program_id, package_id, product_id, entry_date, quantity) 
      SELECT 
        gen_random_uuid(), 
        program_record.id, 
        catering_package_id, 
        pr.id as product_id, 
        d.date as entry_date, 
        COUNT(DISTINCT p.id) as quantity 
      FROM unnest(affected_dates) as d(date) 
      CROSS JOIN products pr 
      LEFT JOIN participants p ON p.program_id = program_record.id 
        AND DATE(p.reception_checkin) <= d.date 
        AND DATE(p.reception_checkout) >= d.date 
        AND (
          -- For full days between check-in/check-out
          (DATE(p.reception_checkin) < d.date AND DATE(p.reception_checkout) > d.date)
          OR
          -- For check-in day, only count products whose slots start after check-in time or overlap
          (DATE(p.reception_checkin) = d.date AND 
            (p.reception_checkin <= (d.date + pr.slot_start::time) OR 
             (pr.slot_start::time <= pr.slot_end::time AND 
              p.reception_checkin > (d.date + pr.slot_start::time) AND 
              p.reception_checkin < (d.date + pr.slot_end::time))))
          OR
          -- For check-out day, only count products whose slots end before check-out time or overlap
          (DATE(p.reception_checkout) = d.date AND 
            (p.reception_checkout >= (d.date + pr.slot_end::time) OR 
             (pr.slot_start::time <= pr.slot_end::time AND 
              p.reception_checkout > (d.date + pr.slot_start::time) AND 
              p.reception_checkout < (d.date + pr.slot_end::time))))
        ) 
      WHERE pr.package_id = catering_package_id
      GROUP BY pr.id, d.date
      HAVING COUNT(DISTINCT p.id) > 0;
    END IF;
    
  -- For INSERT operations
  ELSIF TG_OP = 'INSERT' THEN 
    participant_start_date := DATE(NEW.reception_checkin);
    participant_end_date := DATE(NEW.reception_checkout);
    
    -- Loop through each date
    check_date := participant_start_date;
    WHILE check_date <= participant_end_date LOOP 
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
          
          -- Set check-in/out times for comparison
          checkin_time := NEW.reception_checkin;
          checkout_time := NEW.reception_checkout;
          should_count := false;
          
          -- Determine if this slot should be counted
          IF check_date = participant_start_date THEN 
            -- For check-in day
            should_count := 
              -- Only count slots that start after check-in or overlap with check-in
              (checkin_time <= slot_start) OR 
              (slot_start < checkin_time AND checkin_time < slot_end);
          ELSIF check_date = participant_end_date THEN 
            -- For check-out day
            should_count := 
              -- Only count slots that end before check-out or overlap with check-out
              (checkout_time >= slot_end) OR
              (slot_start < checkout_time AND checkout_time < slot_end);
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
          
          -- Set check-in/out times for comparison
          checkin_time := NEW.reception_checkin;
          checkout_time := NEW.reception_checkout;
          should_count := false;
          
          -- Determine if this slot should be counted
          IF check_date = participant_start_date THEN 
            -- For check-in day
            should_count := 
              -- Only count slots that start after check-in or overlap with check-in
              (checkin_time <= slot_start) OR 
              (slot_start < checkin_time AND checkin_time < slot_end);
          ELSIF check_date = participant_end_date THEN 
            -- For check-out day
            should_count := 
              -- Only count slots that end before check-out or overlap with check-out
              (checkout_time >= slot_end) OR
              (slot_start < checkout_time AND checkout_time < slot_end);
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
              AND be.package_id = catering_package_id
              AND be.product_id = product_record.id 
              AND be.entry_date = check_date;
            
            -- If no row was updated, insert new entry
            IF NOT FOUND THEN 
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
      
      check_date := check_date + INTERVAL '1 day';
    END LOOP;
    
  -- For DELETE operations
  ELSIF TG_OP = 'DELETE' THEN 
    -- Decrement quantities for the deleted participant for normal package
    IF normal_package_id IS NOT NULL THEN
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
    
    -- Decrement quantities for the deleted participant for catering package
    IF catering_package_id IS NOT NULL THEN
      UPDATE billing_entries be 
      SET quantity = quantity - 1 
      WHERE be.program_id = program_record.id 
        AND be.package_id = catering_package_id
        AND be.entry_date BETWEEN DATE(OLD.reception_checkin) AND DATE(OLD.reception_checkout);
      
      -- Remove entries where quantity becomes 0
      DELETE FROM billing_entries be 
      WHERE be.program_id = program_record.id 
        AND be.package_id = catering_package_id
        AND be.entry_date BETWEEN DATE(OLD.reception_checkin) AND DATE(OLD.reception_checkout) 
        AND quantity <= 0;
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN 
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$function$