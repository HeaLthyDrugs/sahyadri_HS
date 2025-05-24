CREATE OR REPLACE FUNCTION public.calculate_entries_for_participant() 
RETURNS trigger LANGUAGE plpgsql AS $function$ 
DECLARE 
  program_record programs%ROWTYPE;
  normal_package_id UUID;
  affected_dates DATE[];
  participant_id UUID;
  checkin_timestamp TIMESTAMPTZ;
  checkout_timestamp TIMESTAMPTZ;
  rows_count INTEGER;
BEGIN 
  -- On DELETE, just delete the billing entries for this participant
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.billing_entries 
    WHERE billing_entries.participant_id = OLD.id;
    RETURN OLD;
  END IF;
  -- Get the normal package ID (CATERING PACKAGE)
  SELECT id INTO normal_package_id FROM packages WHERE type = 'Normal' LIMIT 1;
  IF normal_package_id IS NULL THEN 
    RAISE NOTICE 'No package with type "Normal" found';
    RETURN NULL; 
  END IF;

  -- Determine which participant record to process based on operation type
  IF TG_OP = 'DELETE' THEN
    participant_id := OLD.id;
    checkin_timestamp := OLD.reception_checkin;
    checkout_timestamp := OLD.reception_checkout;
    SELECT * INTO program_record FROM programs WHERE id = OLD.program_id;
  ELSE
    participant_id := NEW.id;
    checkin_timestamp := NEW.reception_checkin;
    checkout_timestamp := NEW.reception_checkout;
    SELECT * INTO program_record FROM programs WHERE id = NEW.program_id;
  END IF;

  -- Skip processing if program not found
  IF program_record IS NULL THEN 
    RAISE NOTICE 'No program found for participant %', participant_id;
    RETURN NULL; 
  END IF;

  -- Skip processing if check-in or check-out is missing
  IF checkin_timestamp IS NULL OR checkout_timestamp IS NULL THEN
    RAISE NOTICE 'Participant % has missing check-in or check-out time', participant_id;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  -- Skip processing if check-out is before check-in (invalid data)
  IF checkout_timestamp < checkin_timestamp THEN
    RAISE NOTICE 'Participant % has check-out before check-in', participant_id;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  -- Convert timestamps to IST (Asia/Kolkata timezone)
  DECLARE
    checkin_ist TIMESTAMPTZ;
    checkout_ist TIMESTAMPTZ;
  BEGIN
    -- Convert to IST for proper date determination
    checkin_ist := checkin_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata';
    checkout_ist := checkout_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata';
    
    -- Generate the array of dates from check-in to check-out (inclusive)
    WITH date_range AS (
      SELECT generate_series(
        date_trunc('day', checkin_ist),
        date_trunc('day', checkout_ist),
        '1 day'::interval
      )::date AS day_date
    )
    SELECT array_agg(day_date) INTO affected_dates FROM date_range;
  END;

  -- For DELETE and UPDATE operations, remove existing entries for affected dates
  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    DELETE FROM billing_entries 
    WHERE program_id = program_record.id 
      AND package_id = normal_package_id 
      AND entry_date = ANY(affected_dates);
  END IF;

  -- Only proceed with INSERT/UPDATE operations
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    -- Recalculate entries for all affected dates and products
    WITH valid_participants AS (
      SELECT 
        id,
        reception_checkin AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' AS checkin_ist,
        reception_checkout AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' AS checkout_ist
      FROM participants
      WHERE 
        program_id = program_record.id
        AND reception_checkin IS NOT NULL
        AND reception_checkout IS NOT NULL
        AND reception_checkout > reception_checkin
        -- Skip the current participant if we're deleting them
        AND (TG_OP != 'DELETE' OR id != participant_id)
    ),
    -- Generate entries for each date and product
    calculated_entries AS (
      SELECT
        d.date_val AS entry_date,
        pr.id AS product_id,
        COUNT(DISTINCT p.id) AS quantity
      FROM
        unnest(affected_dates) AS d(date_val)
        CROSS JOIN products pr
        LEFT JOIN valid_participants p ON (
          -- A participant consumed a product on a specific date if:
          -- 1. They were checked in before the product's end time on that date
          -- 2. They checked out after the product's start time on that date
          p.checkin_ist <= ((d.date_val + pr.slot_end::time)::timestamp AT TIME ZONE 'Asia/Kolkata') AND
          p.checkout_ist >= ((d.date_val + pr.slot_start::time)::timestamp AT TIME ZONE 'Asia/Kolkata')
        )
      WHERE
        pr.package_id = normal_package_id
      GROUP BY d.date_val, pr.id
      HAVING COUNT(DISTINCT p.id) > 0
    )
    -- Insert the calculated entries with ON CONFLICT handling
    INSERT INTO billing_entries (id, program_id, package_id, product_id, participant_id, entry_date, quantity)
    SELECT
      gen_random_uuid(),
      program_record.id,
      normal_package_id,
      product_id,
      participant_id,
      entry_date,
      quantity
    FROM calculated_entries
    ON CONFLICT (program_id, package_id, product_id, entry_date) 
    DO UPDATE SET
      quantity = EXCLUDED.quantity,
      updated_at = NOW();
    
    -- Get the count of affected rows
    GET DIAGNOSTICS rows_count = ROW_COUNT;
    
    -- Log the number of rows inserted
    RAISE NOTICE 'Inserted/updated % billing entries for affected dates %', 
      rows_count, 
      affected_dates;
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$function$