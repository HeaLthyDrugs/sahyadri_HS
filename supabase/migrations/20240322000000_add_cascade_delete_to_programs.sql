-- Drop existing foreign key constraints
ALTER TABLE billing_entries DROP CONSTRAINT IF EXISTS billing_entries_program_id_fkey;
ALTER TABLE participants DROP CONSTRAINT IF EXISTS participants_program_id_fkey;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_program_id_fkey;

-- Add new foreign key constraints with ON DELETE CASCADE
ALTER TABLE billing_entries 
  ADD CONSTRAINT billing_entries_program_id_fkey 
  FOREIGN KEY (program_id) 
  REFERENCES programs(id) 
  ON DELETE CASCADE;

ALTER TABLE participants 
  ADD CONSTRAINT participants_program_id_fkey 
  FOREIGN KEY (program_id) 
  REFERENCES programs(id) 
  ON DELETE CASCADE;

ALTER TABLE invoices 
  ADD CONSTRAINT invoices_program_id_fkey 
  FOREIGN KEY (program_id) 
  REFERENCES programs(id) 
  ON DELETE CASCADE; 