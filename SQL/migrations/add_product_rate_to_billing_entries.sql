-- Add product_rate column to billing_entries table
ALTER TABLE public.billing_entries 
ADD COLUMN product_rate NUMERIC(10, 2) NOT NULL DEFAULT 0;

-- Update existing records with current product rates
UPDATE public.billing_entries 
SET product_rate = p.rate
FROM products p 
WHERE billing_entries.product_id = p.id;

-- Remove the default constraint after updating existing data
ALTER TABLE public.billing_entries 
ALTER COLUMN product_rate DROP DEFAULT;