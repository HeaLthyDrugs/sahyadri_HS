-- Create staff types table
CREATE TABLE IF NOT EXISTS staff_types (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add some default staff types
INSERT INTO staff_types (name, description) VALUES
('full_time', 'Full-time employees working standard hours'),
('part_time', 'Part-time employees working reduced hours'),
('contractor', 'External contractors or consultants'),
('volunteer', 'Volunteer staff members')
ON CONFLICT DO NOTHING;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_staff_types_updated_at
    BEFORE UPDATE ON staff_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key to staff table
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS type_id UUID REFERENCES staff_types(id);

-- Migrate existing staff types to new table
UPDATE staff s
SET type_id = st.id
FROM staff_types st
WHERE s.type::varchar = st.name; 