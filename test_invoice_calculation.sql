-- SQL Query to Test Invoice Calculations
-- This query replicates the same logic used in the MonthlyReport component and Invoice

-- INSTRUCTIONS:
-- 1. Replace 'YOUR-PACKAGE-UUID-HERE' with your actual package UUID
-- 2. Replace '2025-07-01' and '2025-07-31' with your actual date range
-- 3. Run each section separately to debug step by step

-- =====================================
-- SECTION 1: Package Information
-- =====================================
SELECT 
    'Package Information:' as info,
    id,
    name,
    type
FROM packages 
WHERE id = 'YOUR-PACKAGE-UUID-HERE';

-- =====================================
-- SECTION 2: Program Billing Entries
-- =====================================
SELECT 
    'PROGRAM ENTRIES' as section,
    be.entry_date,
    be.quantity,
    p.name as product_name,
    p.rate as product_rate,
    (be.quantity * p.rate) as line_total,
    prog.name as program_name,
    prog.customer_name
FROM billing_entries be
INNER JOIN products p ON be.product_id = p.id
INNER JOIN programs prog ON be.program_id = prog.id
WHERE be.package_id = 'YOUR-PACKAGE-UUID-HERE'
    AND be.entry_date >= '2025-07-01'  -- Replace with your start date
    AND be.entry_date <= '2025-07-31'  -- Replace with your end date
ORDER BY be.entry_date, p.index, p.name;

-- =====================================
-- SECTION 3: Staff Billing Entries
-- =====================================
SELECT 
    'STAFF ENTRIES' as section,
    sbe.entry_date,
    sbe.quantity,
    p.name as product_name,
    p.rate as product_rate,
    (sbe.quantity * p.rate) as line_total,
    'Staff' as source
FROM staff_billing_entries sbe
INNER JOIN products p ON sbe.product_id = p.id
WHERE sbe.package_id = 'YOUR-PACKAGE-UUID-HERE'
    AND sbe.entry_date >= '2025-07-01'  -- Replace with your start date
    AND sbe.entry_date <= '2025-07-31'  -- Replace with your end date
ORDER BY sbe.entry_date, p.index, p.name;

-- =====================================
-- SECTION 4: Combined and Aggregated (Invoice View)
-- =====================================
WITH combined_entries AS (
    -- Program entries
    SELECT 
        p.id as product_id,
        p.name as product_name,
        p.rate as product_rate,
        p.index as product_index,
        be.quantity,
        (be.quantity * p.rate) as line_total,
        'Program: ' || prog.name as source
    FROM billing_entries be
    INNER JOIN products p ON be.product_id = p.id
    INNER JOIN programs prog ON be.program_id = prog.id
    WHERE be.package_id = 'YOUR-PACKAGE-UUID-HERE'
        AND be.entry_date >= '2025-07-01'
        AND be.entry_date <= '2025-07-31'
    
    UNION ALL
    
    -- Staff entries
    SELECT 
        p.id as product_id,
        p.name as product_name,
        p.rate as product_rate,
        p.index as product_index,
        sbe.quantity,
        (sbe.quantity * p.rate) as line_total,
        'Staff' as source
    FROM staff_billing_entries sbe
    INNER JOIN products p ON sbe.product_id = p.id
    WHERE sbe.package_id = 'YOUR-PACKAGE-UUID-HERE'
        AND sbe.entry_date >= '2025-07-01'
        AND sbe.entry_date <= '2025-07-31'
)
SELECT 
    'INVOICE AGGREGATION' as section,
    product_name,
    product_rate,
    SUM(quantity) as total_quantity,
    SUM(line_total) as total_amount,
    STRING_AGG(DISTINCT source, ', ') as sources,
    product_index
FROM combined_entries
GROUP BY product_id, product_name, product_rate, product_index
ORDER BY product_index;

-- =====================================
-- SECTION 5: Grand Total
-- =====================================
WITH combined_totals AS (
    -- Program totals
    SELECT SUM(be.quantity * p.rate) as total
    FROM billing_entries be
    INNER JOIN products p ON be.product_id = p.id
    WHERE be.package_id = 'YOUR-PACKAGE-UUID-HERE'
        AND be.entry_date >= '2025-07-01'
        AND be.entry_date <= '2025-07-31'
    
    UNION ALL
    
    -- Staff totals
    SELECT SUM(sbe.quantity * p.rate) as total
    FROM staff_billing_entries sbe
    INNER JOIN products p ON sbe.product_id = p.id
    WHERE sbe.package_id = 'YOUR-PACKAGE-UUID-HERE'
        AND sbe.entry_date >= '2025-07-01'
        AND sbe.entry_date <= '2025-07-31'
)
SELECT 
    'GRAND TOTAL:' as label,
    SUM(total) as grand_total_amount
FROM combined_totals;

-- =====================================
-- SECTION 6: Summary by Source
-- =====================================
SELECT 
    'SUMMARY BY SOURCE' as section,
    source,
    SUM(quantity) as total_quantity,
    SUM(amount) as total_amount
FROM (
    SELECT 
        prog.name as source,
        be.quantity,
        (be.quantity * p.rate) as amount
    FROM billing_entries be
    INNER JOIN products p ON be.product_id = p.id
    INNER JOIN programs prog ON be.program_id = prog.id
    WHERE be.package_id = 'YOUR-PACKAGE-UUID-HERE'
        AND be.entry_date >= '2025-07-01'
        AND be.entry_date <= '2025-07-31'
    
    UNION ALL
    
    SELECT 
        'Staff' as source,
        sbe.quantity,
        (sbe.quantity * p.rate) as amount
    FROM staff_billing_entries sbe
    INNER JOIN products p ON sbe.product_id = p.id
    WHERE sbe.package_id = 'YOUR-PACKAGE-UUID-HERE'
        AND sbe.entry_date >= '2025-07-01'
        AND sbe.entry_date <= '2025-07-31'
) combined_summary
GROUP BY source
ORDER BY source;

-- =====================================
-- SECTION 7: Count Check
-- =====================================
SELECT 
    'ENTRY COUNTS' as section,
    'Program entries' as type,
    COUNT(*) as count
FROM billing_entries be
WHERE be.package_id = 'YOUR-PACKAGE-UUID-HERE'
    AND be.entry_date >= '2025-07-01'
    AND be.entry_date <= '2025-07-31'

UNION ALL

SELECT 
    'ENTRY COUNTS' as section,
    'Staff entries' as type,
    COUNT(*) as count
FROM staff_billing_entries sbe
WHERE sbe.package_id = 'YOUR-PACKAGE-UUID-HERE'
    AND sbe.entry_date >= '2025-07-01'
    AND sbe.entry_date <= '2025-07-31';

-- =====================================
-- QUICK TEST QUERY (All in one)
-- =====================================
-- Replace YOUR-PACKAGE-UUID-HERE with actual UUID and dates

/*
WITH combined AS (
    SELECT p.name, p.rate, p.index, be.quantity
    FROM billing_entries be
    JOIN products p ON be.product_id = p.id
    WHERE be.package_id = 'YOUR-PACKAGE-UUID-HERE'
        AND be.entry_date BETWEEN '2025-07-01' AND '2025-07-31'
    
    UNION ALL
    
    SELECT p.name, p.rate, p.index, sbe.quantity
    FROM staff_billing_entries sbe
    JOIN products p ON sbe.product_id = p.id
    WHERE sbe.package_id = 'YOUR-PACKAGE-UUID-HERE'
        AND sbe.entry_date BETWEEN '2025-07-01' AND '2025-07-31'
)
SELECT 
    name as product,
    rate,
    SUM(quantity) as qty,
    SUM(quantity * rate) as total,
    'Total: ₹' || SUM(SUM(quantity * rate)) OVER() as grand_total
FROM combined
GROUP BY name, rate, index
ORDER BY index;
*/
