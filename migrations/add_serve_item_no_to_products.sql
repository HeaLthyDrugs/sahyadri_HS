-- Add serve_item_no column to products table
ALTER TABLE public.products
ADD COLUMN serve_item_no integer NULL;

-- If you need to rollback the changes:
-- ALTER TABLE public.products DROP COLUMN serve_item_no;
