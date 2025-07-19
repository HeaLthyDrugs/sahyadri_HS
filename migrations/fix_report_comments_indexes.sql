-- First, check if the indexes exist and drop them if they do
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_report_comments_staff_unique') THEN
        DROP INDEX idx_report_comments_staff_unique;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_report_comments_program_unique') THEN
        DROP INDEX idx_report_comments_program_unique;
    END IF;
END $$;

-- Now recreate the indexes with the exact column names
CREATE UNIQUE INDEX idx_report_comments_staff_unique 
ON public.report_comments (report_type, reference_id, month, "ofStaff")
WHERE "ofStaff" = true AND month IS NOT NULL;

CREATE UNIQUE INDEX idx_report_comments_program_unique 
ON public.report_comments (report_type, reference_id, "ofStaff")
WHERE "ofStaff" = false;

-- Check the indexes to make sure they were created correctly
SELECT 
    indexname, 
    indexdef 
FROM 
    pg_indexes 
WHERE 
    tablename = 'report_comments' 
    AND indexname IN ('idx_report_comments_staff_unique', 'idx_report_comments_program_unique');

-- Show the column names of the table to verify the exact column names
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM 
    information_schema.columns 
WHERE 
    table_name = 'report_comments' 
ORDER BY 
    ordinal_position; 