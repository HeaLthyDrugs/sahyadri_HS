-- Add sequence_number column to participants table
ALTER TABLE participants ADD COLUMN sequence_number INTEGER;

-- Create an index for faster sorting
CREATE INDEX idx_participants_sequence_number ON participants(sequence_number);

-- Comment on the new column
COMMENT ON COLUMN participants.sequence_number IS 'Sequential order number to preserve the original order from imported files'; 