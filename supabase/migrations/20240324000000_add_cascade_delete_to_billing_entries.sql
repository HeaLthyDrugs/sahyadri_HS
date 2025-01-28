-- Drop the existing foreign key constraint
ALTER TABLE billing_entries
DROP CONSTRAINT IF EXISTS billing_entries_product_id_fkey;

-- Add the new foreign key constraint with ON DELETE CASCADE
ALTER TABLE billing_entries
ADD CONSTRAINT billing_entries_product_id_fkey
FOREIGN KEY (product_id)
REFERENCES products(id)
ON DELETE CASCADE; 