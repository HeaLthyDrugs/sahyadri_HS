-- First, create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create staff_types table first
CREATE TABLE IF NOT EXISTS public.staff_types (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add trigger for staff_types
CREATE TRIGGER update_staff_types_updated_at
    BEFORE UPDATE ON public.staff_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add default staff types
INSERT INTO public.staff_types (name, description) VALUES
('full_time', 'Full-time employees working standard hours'),
('part_time', 'Part-time employees working reduced hours'),
('contractor', 'External contractors or consultants'),
('volunteer', 'Volunteer staff members')
ON CONFLICT DO NOTHING;

-- 2. Create staff table
CREATE TABLE IF NOT EXISTS public.staff (
    id bigserial NOT NULL,
    name text NOT NULL,
    type_id UUID NOT NULL,
    organisation text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT staff_pkey PRIMARY KEY (id),
    CONSTRAINT staff_type_id_fkey FOREIGN KEY (type_id)
        REFERENCES public.staff_types(id) ON DELETE RESTRICT
);

-- Create indexes for staff table
CREATE INDEX IF NOT EXISTS idx_staff_name ON public.staff USING btree (name);
CREATE INDEX IF NOT EXISTS idx_staff_type_id ON public.staff USING btree (type_id);
CREATE INDEX IF NOT EXISTS idx_staff_organisation ON public.staff USING btree (organisation);

-- Add trigger for staff
CREATE TRIGGER update_staff_updated_at
    BEFORE UPDATE ON public.staff
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. Create staff_comments table
CREATE TABLE IF NOT EXISTS public.staff_comments (
    id bigserial NOT NULL,
    staff_id bigint NOT NULL,
    comment text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT staff_comments_pkey PRIMARY KEY (id),
    CONSTRAINT staff_comments_staff_id_fkey 
        FOREIGN KEY (staff_id) 
        REFERENCES public.staff(id) ON DELETE CASCADE,
    CONSTRAINT staff_comments_created_by_fkey 
        FOREIGN KEY (created_by) 
        REFERENCES auth.users(id)
);

-- Create index for staff_comments
CREATE INDEX IF NOT EXISTS idx_staff_comments_staff_id 
    ON public.staff_comments USING btree (staff_id);

-- Add trigger for staff_comments
CREATE TRIGGER update_staff_comments_updated_at
    BEFORE UPDATE ON public.staff_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 