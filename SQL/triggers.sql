-- Drop existing functions and triggers
DROP FUNCTION IF EXISTS recalculate_program_entries(uuid);
DROP FUNCTION IF EXISTS calculate_entries_on_participant_insert() CASCADE;

-- Create the trigger function with fixed column references
CREATE OR REPLACE FUNCTION calculate_entries_on_participant_insert()
RETURNS TRIGGER AS $$
DECLARE
  program_record RECORD;
  product_record RECORD;
  curr_date DATE;
BEGIN
  -- Get program details
  SELECT * INTO program_record FROM programs WHERE id = NEW.program_id;
  
  -- For each day the participant is present
  FOR curr_date IN 
    SELECT generate_series(
      DATE(NEW.reception_checkin AT TIME ZONE 'UTC'),
      DATE(NEW.reception_checkout AT TIME ZONE 'UTC'),
      '1 day'::interval
    )::date
  LOOP
    -- For each product
    FOR product_record IN 
      SELECT p.* 
      FROM products p
    LOOP
      -- Calculate quantity based on time slots
      IF DATE(NEW.reception_checkin AT TIME ZONE 'UTC') = curr_date 
         AND (NEW.reception_checkin AT TIME ZONE 'UTC')::time <= product_record.slot_end 
         AND (NEW.reception_checkout AT TIME ZONE 'UTC')::time >= product_record.slot_start 
      THEN
        -- Insert or update billing entry with explicitly generated UUID
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

-- Create the recalculation function
CREATE OR REPLACE FUNCTION recalculate_program_entries(program_id_param uuid)
RETURNS void AS $$
BEGIN
  -- Clear existing entries for this program
  DELETE FROM billing_entries WHERE program_id = program_id_param;
  
  -- Recalculate for each participant with explicit id generation
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
    p.program_id,
    pr.package_id,
    pr.id as product_id,
    d.date as entry_date,
    COUNT(DISTINCT p.id) as quantity
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
    JOIN products pr ON true
  WHERE 
    p.program_id = program_id_param
    AND DATE(p.reception_checkin) <= d.date
    AND DATE(p.reception_checkout) >= d.date
    AND p.reception_checkin::time <= pr.slot_end
    AND p.reception_checkout::time >= pr.slot_start
  GROUP BY 
    p.program_id, pr.package_id, pr.id, d.date;
END;
$$ LANGUAGE plpgsql;

