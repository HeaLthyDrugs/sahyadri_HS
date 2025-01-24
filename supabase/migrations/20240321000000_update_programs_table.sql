-- Add index and unique code columns to programs table
ALTER TABLE programs 
ADD COLUMN IF NOT EXISTS program_index SERIAL,
ADD COLUMN IF NOT EXISTS program_code VARCHAR(20) UNIQUE NOT NULL DEFAULT CONCAT('PRG', LPAD(CAST(nextval('programs_program_index_seq') as VARCHAR), 6, '0'));

-- Create trigger to auto-generate program code
CREATE OR REPLACE FUNCTION generate_program_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.program_code := CONCAT('PRG', LPAD(CAST(NEW.program_index as VARCHAR), 6, '0'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_program_code
BEFORE INSERT ON programs
FOR EACH ROW
EXECUTE FUNCTION generate_program_code(); 