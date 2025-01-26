-- Create sequence if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS programs_number_seq;

-- Add program_number column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'programs' 
                  AND column_name = 'program_number') THEN
        ALTER TABLE programs ADD COLUMN program_number integer;
        ALTER TABLE programs ALTER COLUMN program_number SET DEFAULT nextval('programs_number_seq');
    END IF;
END $$;

-- Reset sequence to 1
ALTER SEQUENCE programs_number_seq RESTART WITH 1;

-- Update existing programs with sequential numbers
WITH numbered_programs AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as new_number
  FROM programs
)
UPDATE programs p
SET program_number = np.new_number
FROM numbered_programs np
WHERE p.id = np.id; 