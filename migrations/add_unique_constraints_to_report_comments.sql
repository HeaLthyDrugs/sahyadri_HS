-- Add unique constraints to report_comments table to support upsert operations

-- First, remove any duplicate records that would violate the unique constraints
-- For staff comments (with month)
WITH duplicates AS (
  SELECT 
    report_type, 
    reference_id, 
    month, 
    "ofStaff",
    MAX(updated_at) as latest_update,
    array_agg(id) as ids
  FROM public.report_comments
  WHERE "ofStaff" = true AND month IS NOT NULL
  GROUP BY report_type, reference_id, month, "ofStaff"
  HAVING COUNT(*) > 1
)
DELETE FROM public.report_comments
WHERE id IN (
  SELECT unnest(ids[2:]) 
  FROM duplicates
);

-- For program comments (without month)
WITH duplicates AS (
  SELECT 
    report_type, 
    reference_id, 
    "ofStaff",
    MAX(updated_at) as latest_update,
    array_agg(id) as ids
  FROM public.report_comments
  WHERE "ofStaff" = false
  GROUP BY report_type, reference_id, "ofStaff"
  HAVING COUNT(*) > 1
)
DELETE FROM public.report_comments
WHERE id IN (
  SELECT unnest(ids[2:]) 
  FROM duplicates
);

-- Now add the unique constraints with the correct syntax for partial indexes
-- For staff comments (with month)
CREATE UNIQUE INDEX idx_report_comments_staff_unique
ON public.report_comments (report_type, reference_id, month, "ofStaff")
WHERE "ofStaff" = true AND month IS NOT NULL;

-- For program comments (without month)
CREATE UNIQUE INDEX idx_report_comments_program_unique
ON public.report_comments (report_type, reference_id, "ofStaff")
WHERE "ofStaff" = false;

-- Add comments to explain the purpose of the indexes
COMMENT ON INDEX idx_report_comments_staff_unique IS 'Ensures uniqueness for staff comments with month';
COMMENT ON INDEX idx_report_comments_program_unique IS 'Ensures uniqueness for program comments'; 