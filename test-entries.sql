-- 1. Setup Test Data

-- Create Normal package if not exists
INSERT INTO packages (name, type, description)
SELECT 'Standard Package', 'Normal', 'Standard catering package'
WHERE NOT EXISTS (
    SELECT 1 FROM packages WHERE type = 'Normal'
)
RETURNING id;

-- Get Normal package ID
WITH normal_package AS (
    SELECT id FROM packages WHERE type = 'Normal' LIMIT 1
)
-- Create test products if they don't exist
INSERT INTO products (name, package_id, rate, slot_start, slot_end, category, index)
SELECT 'Breakfast', id, 100, '08:00', '10:00', (SELECT id FROM categories LIMIT 1), 1
FROM normal_package
WHERE NOT EXISTS (
    SELECT 1 FROM products WHERE name = 'Breakfast' AND package_id = (SELECT id FROM normal_package)
);

WITH normal_package AS (
    SELECT id FROM packages WHERE type = 'Normal' LIMIT 1
)
INSERT INTO products (name, package_id, rate, slot_start, slot_end, category, index)
SELECT 'Lunch', id, 150, '12:00', '14:00', (SELECT id FROM categories LIMIT 1), 2
FROM normal_package
WHERE NOT EXISTS (
    SELECT 1 FROM products WHERE name = 'Lunch' AND package_id = (SELECT id FROM normal_package)
);

-- Create test program if not exists
INSERT INTO programs (
    name, 
    customer_name,
    start_date, 
    end_date, 
    start_time,
    end_time,
    days,
    total_participants,
    status
)
SELECT 
    'Test Program',
    'Test Customer',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '2 days',
    '08:00',
    '17:00',
    3,
    10,
    'Ongoing'
WHERE NOT EXISTS (
    SELECT 1 FROM programs WHERE name = 'Test Program'
)
RETURNING id;

-- Test Case 1: Insert Participant
-- This should create entries for both breakfast and lunch
INSERT INTO participants (
    program_id,
    attendee_name,
    reception_checkin,
    reception_checkout
)
VALUES (
    (SELECT id FROM programs WHERE name = 'Test Program'),
    'Test Participant 1',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '8 hours'
);

-- Verify entries were created
SELECT 
    p.name as product_name,
    be.entry_date,
    be.quantity
FROM billing_entries be
JOIN products p ON p.id = be.product_id
WHERE be.program_id = (SELECT id FROM programs WHERE name = 'Test Program')
ORDER BY be.entry_date, p.slot_start;

-- Test Case 2: Update Participant
-- Update check-out time to be before lunch, should remove lunch entry
UPDATE participants
SET reception_checkout = reception_checkin + INTERVAL '3 hours'
WHERE attendee_name = 'Test Participant 1';

-- Verify entries were updated
SELECT 
    p.name as product_name,
    be.entry_date,
    be.quantity
FROM billing_entries be
JOIN products p ON p.id = be.product_id
WHERE be.program_id = (SELECT id FROM programs WHERE name = 'Test Program')
ORDER BY be.entry_date, p.slot_start;

-- Test Case 3: Delete Participant
-- Should remove all entries for this participant
DELETE FROM participants
WHERE attendee_name = 'Test Participant 1';

-- Verify entries were removed
SELECT 
    p.name as product_name,
    be.entry_date,
    be.quantity
FROM billing_entries be
JOIN products p ON p.id = be.product_id
WHERE be.program_id = (SELECT id FROM programs WHERE name = 'Test Program')
ORDER BY be.entry_date, p.slot_start; 