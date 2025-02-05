
BEGIN
  RETURN jsonb_build_object(
    'early_arrival_days', 
    CASE 
      WHEN actual_arrival < program_start 
      THEN DATE_PART('day', program_start::timestamp - actual_arrival::timestamp)
      ELSE 0
    END,
    'late_departure_days',
    CASE 
      WHEN actual_departure > program_end 
      THEN DATE_PART('day', actual_departure::timestamp - program_end::timestamp)
      ELSE 0
    END
  );
END;
