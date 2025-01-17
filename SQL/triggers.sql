-- Drop existing functions and triggers
DROP FUNCTION IF EXISTS recalculate_program_entries(uuid);
DROP FUNCTION IF EXISTS calculate_entries_on_participant_insert() CASCADE;

-- Create the updated trigger function
CREATE OR REPLACE FUNCTION calculate_entries_on_participant_insert()
RETURNS TRIGGER AS $$
DECLARE
  program_record RECORD;
  product_record RECORD;
  curr_date DATE;
  checkin_time TIME;
  checkout_time TIME;
BEGIN
  -- Get program details
  SELECT * INTO program_record FROM programs WHERE id = NEW.program_id;
  
  -- For each day the participant is present
  FOR curr_date IN 
    SELECT generate_series(
      DATE(NEW.reception_checkin),
      DATE(NEW.reception_checkout),
      '1 day'::interval
    )::date
  LOOP
    -- Set checkin/checkout times
    IF DATE(NEW.reception_checkin) = curr_date THEN
      checkin_time := NEW.reception_checkin::time;
    ELSE
      checkin_time := '00:00:00'::time;
    END IF;

    IF DATE(NEW.reception_checkout) = curr_date THEN
      checkout_time := NEW.reception_checkout::time;
    ELSE
      checkout_time := '23:59:59'::time;
    END IF;

    -- For each product
    FOR product_record IN 
      SELECT p.* 
      FROM products p
      WHERE p.package_id IS NOT NULL
    LOOP
      -- Check if participant was present during the product's time slot
      IF (checkin_time <= product_record.slot_end AND 
          checkout_time >= product_record.slot_start)
      THEN
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
          NEW.program_id,
          product_record.package_id,
          product_record.id,
          curr_date,
          1
        )
        ON CONFLICT (program_id, package_id, product_id, entry_date)
        DO UPDATE SET 
          quantity = billing_entries.quantity + 1;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER participant_entry_calculator
AFTER INSERT ON participants
FOR EACH ROW
EXECUTE FUNCTION calculate_entries_on_participant_insert();

-- Update the recalculation function as well
CREATE OR REPLACE FUNCTION recalculate_program_entries(program_id_param uuid)
RETURNS void AS $$
BEGIN
  -- Clear existing entries for this program
  DELETE FROM billing_entries WHERE program_id = program_id_param;
  
  -- Insert new entries with proper time slot handling
  WITH participant_days AS (
    SELECT 
      p.id as participant_id,
      p.program_id,
      d.date,
      CASE 
        WHEN DATE(p.reception_checkin) = d.date THEN p.reception_checkin::time
        ELSE '00:00:00'::time
      END as day_checkin,
      CASE 
        WHEN DATE(p.reception_checkout) = d.date THEN p.reception_checkout::time
        ELSE '23:59:59'::time
      END as day_checkout
    FROM 
      participants p
      CROSS JOIN (
        SELECT generate_series(
          DATE(MIN(p2.reception_checkin)),
          DATE(MAX(p2.reception_checkout)),
          '1 day'::interval
        )::date as date
        FROM participants p2
        WHERE p2.program_id = program_id_param
      ) d
    WHERE 
      p.program_id = program_id_param
      AND DATE(p.reception_checkin) <= d.date
      AND DATE(p.reception_checkout) >= d.date
  )
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
    pd.program_id,
    pr.package_id,
    pr.id as product_id,
    pd.date as entry_date,
    COUNT(DISTINCT pd.participant_id) as quantity
  FROM 
    participant_days pd
    CROSS JOIN products pr
  WHERE 
    pd.day_checkin <= pr.slot_end
    AND pd.day_checkout >= pr.slot_start
  GROUP BY 
    pd.program_id, pr.package_id, pr.id, pd.date;
END;
$$ LANGUAGE plpgsql;

