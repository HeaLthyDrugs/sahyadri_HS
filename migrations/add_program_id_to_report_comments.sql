-- Add program_id field to report_comments table
ALTER TABLE public.report_comments ADD COLUMN IF NOT EXISTS program_id uuid NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_report_comments_program ON public.report_comments(program_id);

-- Update existing records if needed
-- This will set program_id to reference_id if reference_id is a valid UUID and ofStaff is false
UPDATE public.report_comments
SET program_id = reference_id::uuid
WHERE ofStaff = false 
  AND reference_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Add comment to explain the purpose of the migration
COMMENT ON COLUMN public.report_comments.program_id IS 'UUID of the program this comment belongs to'; 