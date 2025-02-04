-- Create enum for staff types
CREATE TYPE staff_type AS ENUM ('full_time', 'part_time', 'contractor', 'volunteer');

-- Create staff table
CREATE TABLE IF NOT EXISTS staff (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type staff_type NOT NULL,
    organisation TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create staff comments table for the comment functionality
CREATE TABLE IF NOT EXISTS staff_comments (
    id BIGSERIAL PRIMARY KEY,
    staff_id BIGINT REFERENCES staff(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_staff_name ON staff(name);
CREATE INDEX idx_staff_type ON staff(type);
CREATE INDEX idx_staff_organisation ON staff(organisation);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_staff_updated_at
    BEFORE UPDATE ON staff
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_comments_updated_at
    BEFORE UPDATE ON staff_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 