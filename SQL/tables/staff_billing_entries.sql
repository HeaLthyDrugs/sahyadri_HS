CREATE TABLE IF NOT EXISTS staff_billing_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    staff_id BIGINT NOT NULL REFERENCES staff(id),
    package_id UUID NOT NULL REFERENCES packages(id),
    product_id UUID NOT NULL REFERENCES products(id),
    entry_date DATE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create index for faster queries
CREATE INDEX idx_staff_billing_entries_date ON staff_billing_entries(entry_date);
CREATE INDEX idx_staff_billing_entries_staff ON staff_billing_entries(staff_id);

-- Add RLS policies
ALTER TABLE staff_billing_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON staff_billing_entries
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON staff_billing_entries
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON staff_billing_entries
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users" ON staff_billing_entries
    FOR DELETE TO authenticated USING (true); 