-- Update serve item numbers for existing products
-- This update uses case-insensitive exact matching for each product name

DO $$
DECLARE
    item record;
BEGIN
    -- Create a temporary table to store our mapping with uppercase names to match the database
    CREATE TEMP TABLE item_numbers (
        pattern text,
        serve_item_no integer
    );

    -- Insert all mappings from serve_item_no.json
    INSERT INTO item_numbers (pattern, serve_item_no) VALUES
    -- Beverages
    ('BOURNVITA / HORLICKS / COMPLAN', 10),
    ('BUTTERMILK (FRUIT JUICE II)', 20),
    ('LIME JUICE (FRUIT JUICE II)', 30),
    ('LASSI SWEET', 40),
    ('SEASONAL FRUIT JUICE (FRUIT JUICE I)', 50),
    ('TRAY POT TEA / COFFEE', 60),
    ('TRAY POT TEA / COFFEE WITH BISCUITS', 70),
    ('GREEN TEA / ASSORTED TEA', 80),
    
    -- Veg Snacks
    ('BATATA WADA', 90),
    ('CHEESE CHILLI TOAST', 100),
    ('CHEESE SANDWICH', 110),
    ('COCKTAIL SAMOSA', 120),
    ('FINGER CHIPS', 130),
    ('MIX VEG PAKODA', 140),
    ('PANEER PAKODA', 150),
    ('PUNJABI SAMOSA', 160),
    ('SABUDANA WADA', 170),
    ('STUFFED SANDWICH', 180),
    ('VEG BURGER', 190),
    ('VEG CUTLET', 200),
    ('VEG GRILLED SANDWICH', 210),
    ('VEG SANDWICH', 220),

    -- Non-Veg Snacks
    ('CHICKEN CROISSANT', 230),
    ('CHICKEN HOT DOG ROLL', 240),
    ('CHICKEN SANDWICH', 250),
    ('CHICKEN QUICHE', 260),
    ('CHICKEN VOL AU VENT', 270),
    ('HAM', 280),
    ('BACON', 290),
    ('PORK SALAMI', 300),
    ('CHICKEN SALAMI', 310),
    ('CHICKEN SAUSAGES', 320),
    ('PORK SAUSAGES', 330),

    -- Party Snacks - Veg
    ('ALOO TIKKI', 340),
    ('ASSORTED CANAPES', 350),
    ('BHEL PURI CHAAT', 360),
    ('CHATPATE ALOO', 370),
    ('CHEESE BALLS', 380),
    ('CHEESE CHERRY PINEAPPLE STICKS', 390),
    ('DAHI BATATA PURI', 400),
    ('DELHI CHAAT', 410),
    ('HARA BHARA KEBAB', 420),
    ('LAKHNAVI CHAAT', 430),
    ('PANCHRANGI KEBAB', 440),
    ('PANEER TIKKA', 450),
    ('PANI PURI', 460),
    ('PAV BHAJI', 470),
    ('ROASTED PAPAD', 480),
    ('SHEV BATATA PURI', 490),
    ('VEG GOLD COIN', 500),
    ('VEG HARIYALI KEBAB', 510),
    ('VEG MANCHURIAN', 520),
    ('VEG SEEKH KEBAB', 530),
    ('TANDOORI MUSHROOM BABYCORN', 540),
    ('CRISPY VEG', 550),
    ('MUSHROOM BABYCORN TIKKI', 560),
    ('FRESH CORN TIKKI', 570),
    ('BOILED PEANUTS', 580),
    ('MASALA PEANUTS', 590),
    ('BOILED CHANA', 600),
    ('MASALA CHANA', 610),
    ('POP CORN', 620),
    ('CHANDNI KEBAB', 630),
    ('SHAMI KEBAB', 640),

    -- Fish Items
    ('FISH FINGER (SURMAI)', 730),
    ('FISH FINGER (BASA)', 740),
    ('FISH TIKKA (SURMAI)', 750),
    ('FISH TIKKA (ROHU/KATLA)', 760),
    ('FRIED FISH (SURMAI)', 770),
    ('FRIED FISH (POMPFRET)', 780),
    ('FRIED FISH (OTHER)', 790),
    ('TANDOORI POMFRET', 800),
    ('TAWA FISH (SURMAI)', 810),
    ('TAWA FISH (POMPFRET)', 820),
    ('FISH KOLIWADA', 830),
    ('PRAWNS CHILLY / PRAWNS MANCHURIAN', 840),

    -- Main Course Items
    ('ANY CHINESE VEG PREPARATION', 850),
    ('ANY INDIAN VEG PREPARATION', 860),
    ('ANY ITALIAN VEG PREPARATION', 870),
    ('ANY MEXICAN VEG PREPARATION', 880),
    ('ANY CONTINENTAL VEG PREPARATION', 890),
    ('BOILED VEG', 900),
    ('RICE PREPARATION', 910),
    ('EXTRA FRUITS', 920),
    ('FRUIT DISPLAY', 930),
    ('PAPAD', 940),
    ('ANY SALAD PREPARATION', 950),
    ('FRUIT BASKET', 960),

    -- Desserts
    ('ALL FLAVOURED PUDDINGS', 970),
    ('ALL FLAVOURED SOUFFLES', 980),
    ('AMRAKHAND', 990),
    ('AAMRAS', 1000),
    ('ANGOORI RABADI', 1010),
    ('DOODHI HALWA', 1020),
    ('GAJAR HALWA', 1030),
    ('GULAB JAMUN', 1040),
    ('ICE CREAM (VANILLA / CHOCOLATE)', 1050),
    ('VANILLA ICE CREAM WITH BROWNIE', 1060),
    ('VANILLA ICE CREAM WITH HONEY GLAZED NOODLES', 1070),
    ('ICE CREAM (ORANGE / STRAWBERRY / KESAR PISTA)', 1080),
    ('JAKE SHAHI', 1090),
    ('JALEBI', 1100),
    ('KULFI', 1110),
    ('RASGULLA', 1120),
    ('RASMALAI', 1130),
    ('SHAHI TUKRA', 1140),
    ('SRIKHAND', 1150),
    ('FRESH FRUIT GATEAUX', 1160),
    ('MOONG DAL HALWA', 1170),
    ('JALEBI WITH RABADI', 1180),
    ('SEVAI PAYSAM', 1190),
    ('APPLE KHEER', 1200),
    ('RICE KHEER', 1210),
    ('DRY SWEETS (CHAMCHAM,SANDES,MALAI SANDWICH)', 1220),
    ('MALAI BURFI', 1230),

    -- Non-Veg Preparations
    ('ANY CHINESE NON VEG PREPARATION', 1240),
    ('ANY INDIAN NON VEG PREPARATION', 1250),
    ('ANY ITALIAN NON VEG PREPARATION', 1260),
    ('ANY MEXICAN NON VEG PREPARATION', 1270),
    ('ANY CONTINENTAL NON VEG PREPARATION', 1280),
    ('ANY THAI NON VEG PREPARATION', 1290),
    ('NON VEG SOUP', 1300),
    ('WORKING LUNCH', 1310),

    -- Bakery Items
    ('SHREWSBURY BISCUITS (500 GM)', 1320),
    ('ICING CAKE VANILLA / PINEAPPLE (WITH EGG) 500 GM', 1330),
    ('ICING CAKE VANILLA / PINEAPPLE (EGGLESS) 500 GM', 1340),
    ('ICING CAKE BUTTER SCOTCH / BLUEBERRY / MANGO (WITH EGG) 500 GRM', 1350),
    ('ICING CAKE BUTTER SCOTCH / BLUEBERRY / MANGO ( EGGLESS) 500 GRM', 1360),
    ('MUFFINS', 1380),
    ('TART', 1390),
    ('CALZONE', 1400),
    ('GINGER BREAD / CAKE (1KG)', 1410),
    ('DRY CAKES (WALNUTS, DRY FRUITS)', 1430),
    ('DRY FRUITS', 1440),
    ('CHOCOLATES', 1450);

    -- Update products table using our mapping
    FOR item IN SELECT * FROM item_numbers LOOP
        -- Update using pattern matching
        UPDATE public.products
        SET 
            serve_item_no = item.serve_item_no,
            updated_at = NOW()
        WHERE 
            name ILIKE REPLACE(item.pattern, '%', '%%')
            OR name ILIKE ANY (
                -- Handle cases with multiple variations (separated by /)
                STRING_TO_ARRAY(
                    REPLACE(item.pattern, '%', '%%'),
                    '/'
                )
            );
    END LOOP;

    -- Special handling for items with same serve_item_no (chicken items with 650)
    UPDATE public.products
    SET 
        serve_item_no = 650,
        updated_at = NOW()
    WHERE 
        name IN (
            'CHICKEN AFGANI KEBAB',
            'MURGH MALAI KEBAB',
            'CHICKEN TIKKA',
            'CHICKEN SEEKH KEBAB',
            'CHICKEN PAHADI KEBAB',
            'CHICKEN BALLS',
            'CHICKEN RESHMI KEBAB',
            'CHICKEN GINGER FLAKES'
        );

    -- Special handling for items with serve_item_no 720
    UPDATE public.products
    SET 
        serve_item_no = 720,
        updated_at = NOW()
    WHERE 
        name IN (
            'CHICKEN CHILLI',
            'CHICKEN MANCHURIAN',
            'CHICKEN LOLLY POP',
            'CHICKEN SCHEZWAN FRIES'
        );

    -- Handle items with same serve_item_no 1370 (Cookies variations)
    UPDATE public.products
    SET 
        serve_item_no = 1370,
        updated_at = NOW()
    WHERE 
        name IN ('COOKIES (1 KGS)', 'COOKIES (250 GMS)');

    -- Handle items with same serve_item_no 1420 (Dry Cake variations)
    UPDATE public.products
    SET 
        serve_item_no = 1420,
        updated_at = NOW()
    WHERE 
        name IN ('DRY CAKE (1 KG)', 'DRY CAKE (250 GRM)');

    -- Clean up
    DROP TABLE item_numbers;
END $$;

-- Verification queries

-- 1. Show all updated products ordered by serve_item_no
SELECT 
    serve_item_no,
    name,
    description,
    rate
FROM public.products 
WHERE serve_item_no IS NOT NULL 
ORDER BY serve_item_no;

-- 2. Count total updates
SELECT COUNT(*) as total_updated_products 
FROM public.products 
WHERE serve_item_no IS NOT NULL;

-- 3. List unmatched products (products without serve_item_no)
SELECT 
    name,
    description,
    rate
FROM public.products 
WHERE serve_item_no IS NULL 
ORDER BY name;

-- 4. Verify items with same serve_item_no
SELECT 
    serve_item_no,
    COUNT(*) as products_count,
    array_agg(name) as product_names
FROM public.products
WHERE serve_item_no IS NOT NULL
GROUP BY serve_item_no
HAVING COUNT(*) > 1
ORDER BY serve_item_no;

-- If you need to rollback, run:
-- UPDATE public.products SET serve_item_no = NULL;
