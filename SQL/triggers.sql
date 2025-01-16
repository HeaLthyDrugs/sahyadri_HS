-- Drop existing functions first
DROP FUNCTION IF EXISTS recalculate_program_entries(uuid);
DROP FUNCTION IF EXISTS calculate_entries_on_participant_insert() CASCADE;

-- Create the trigger function
CREATE OR REPLACE FUNCTION calculate_entries_on_participant_insert()
RETURNS TRIGGER AS $$
DECLARE
  program_record RECORD;
  product_rule RECORD;
  entry_date DATE;
  package_record RECORD;
BEGIN
  -- Get program details
  SELECT * INTO program_record FROM programs WHERE id = NEW.program_id;
  
  -- For each package associated with the program
  FOR package_record IN 
    SELECT DISTINCT p.package_id 
    FROM products p 
    WHERE p.package_id IS NOT NULL
  LOOP
    -- For each day the participant is present
    FOR entry_date IN 
      SELECT generate_series(
        DATE(NEW.reception_checkin),
        DATE(NEW.reception_checkout),
        '1 day'::interval
      )::date
    LOOP
      -- For each product rule in this package
      FOR product_rule IN 
        SELECT pr.*, p.id as product_id
        FROM product_rules pr
        JOIN products p ON p.id = pr.product_id
        WHERE pr.package_id = package_record.package_id
      LOOP
        -- Calculate quantity based on allocation type
        DECLARE
          quantity INTEGER := 0;
        BEGIN
          CASE product_rule.allocation_type
            WHEN 'per_day' THEN
              quantity := product_rule.quantity;
            WHEN 'per_stay' THEN
              quantity := CASE 
                WHEN entry_date = DATE(NEW.reception_checkin)
                THEN product_rule.quantity
                ELSE 0
              END;
            WHEN 'per_hour' THEN
              quantity := product_rule.quantity * 
                EXTRACT(HOUR FROM NEW.reception_checkout - NEW.reception_checkin)::integer;
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
            NEW.program_id,
            package_record.package_id,
            product_rule.product_id,
            entry_date,
            quantity
          )
          ON CONFLICT (program_id, package_id, product_id, entry_date)
          DO UPDATE SET quantity = billing_entries.quantity + EXCLUDED.quantity;

          -- Log for debugging
          RAISE NOTICE 'Inserted/Updated entry for program %, package %, product %, date %, quantity %',
            NEW.program_id, package_record.package_id, product_rule.product_id, entry_date, quantity;
        END;
      END LOOP;
    END LOOP;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS participant_entry_calculator ON participants;
CREATE TRIGGER participant_entry_calculator
AFTER INSERT ON participants
FOR EACH ROW
EXECUTE FUNCTION calculate_entries_on_participant_insert();

-- Create the recalculation function
CREATE OR REPLACE FUNCTION recalculate_program_entries(program_id_param uuid)
RETURNS void AS $$
DECLARE
  participant RECORD;
BEGIN
  -- Clear existing entries for this program
  DELETE FROM billing_entries WHERE program_id = program_id_param;
  
  -- Recalculate for each participant
  FOR participant IN 
    SELECT * FROM participants WHERE program_id = program_id_param
  LOOP
    -- Manually execute the logic from the trigger function
    DECLARE
      program_record RECORD;
      product_rule RECORD;
      entry_date DATE;
      package_record RECORD;
    BEGIN
      -- Get program details
      SELECT * INTO program_record FROM programs WHERE id = participant.program_id;
      
      -- For each package associated with the program
      FOR package_record IN 
        SELECT DISTINCT p.package_id 
        FROM products p 
        WHERE p.package_id IS NOT NULL
      LOOP
        -- For each day the participant is present
        FOR entry_date IN 
          SELECT generate_series(
            DATE(participant.reception_checkin),
            DATE(participant.reception_checkout),
            '1 day'::interval
          )::date
        LOOP
          -- For each product rule in this package
          FOR product_rule IN 
            SELECT pr.*, p.id as product_id
            FROM product_rules pr
            JOIN products p ON p.id = pr.product_id
            WHERE pr.package_id = package_record.package_id
          LOOP
            -- Calculate quantity based on allocation type
            DECLARE
              quantity INTEGER := 0;
            BEGIN
              CASE product_rule.allocation_type
                WHEN 'per_day' THEN
                  quantity := product_rule.quantity;
                WHEN 'per_stay' THEN
                  quantity := CASE 
                    WHEN entry_date = DATE(participant.reception_checkin)
                    THEN product_rule.quantity
                    ELSE 0
                  END;
                WHEN 'per_hour' THEN
                  quantity := product_rule.quantity * 
                    EXTRACT(HOUR FROM participant.reception_checkout - participant.reception_checkin)::integer;
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
                package_record.package_id,
                product_rule.product_id,
                entry_date,
                quantity
              )
              ON CONFLICT (program_id, package_id, product_id, entry_date)
              DO UPDATE SET quantity = billing_entries.quantity + EXCLUDED.quantity;
            END;
          END LOOP;
        END LOOP;
      END LOOP;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

