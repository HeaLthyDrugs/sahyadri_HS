CREATE TABLE IF NOT EXISTS participant_billing_entries (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    billing_entry_id UUID NOT NULL REFERENCES billing_entries(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT participant_billing_entries_participant_billing_unique UNIQUE (participant_id, billing_entry_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_participant_billing_entries_participant ON participant_billing_entries(participant_id);
CREATE INDEX IF NOT EXISTS idx_participant_billing_entries_billing ON participant_billing_entries(billing_entry_id);

-- Add RLS policies
ALTER TABLE participant_billing_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON participant_billing_entries
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON participant_billing_entries
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON participant_billing_entries
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users" ON participant_billing_entries
    FOR DELETE TO authenticated USING (true);