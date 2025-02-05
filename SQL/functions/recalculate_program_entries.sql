
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
