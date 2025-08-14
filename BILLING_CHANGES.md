# Billing System Changes - Participant Type Filtering

## Overview
The billing system has been updated to only calculate billing entries for participants whose type is 'participant'. Other participant types (guest, driver, other) will not contribute to billing calculations.

## Changes Made

### 1. SQL Function Update (`calculate_entries_for_participant.sql`)
- Modified the `valid_participants` CTE to filter only participants with `type = 'participant'`
- Added product rules integration to respect configuration settings
- Only participants with type 'participant' will now generate billing entries

### 2. Product Rules Configuration (`config.tsx`)
- Added complete Product Rules tab functionality
- Allows configuration of which catering package products each participant type can consume
- Provides a user interface to:
  - Select participant type
  - Configure allowed products for each type
  - Save product rules to the database

### 3. Database Integration
- Uses existing `product_rules` table to store configuration
- Integrates with the billing calculation function to respect product rules
- If no rules exist for a product, it defaults to allowed (backward compatibility)

## How It Works

### Billing Calculation Logic
1. When a participant is added/updated/deleted, the database trigger fires
2. The `calculate_entries_for_participant` function runs
3. Only participants with `type = 'participant'` are included in calculations
4. Product rules are checked to determine which products are allowed
5. Billing entries are generated only for allowed products and valid participants

### Product Rules Configuration
1. Navigate to Config → Product Rules tab
2. Select a participant type from the dropdown
3. Check/uncheck products that should be allowed for that type
4. Click "Save Product Rules" to store the configuration
5. The billing system will automatically respect these rules

## Benefits
- **Accurate Billing**: Only actual participants contribute to billing
- **Flexible Configuration**: Different participant types can have different product access
- **Automatic Processing**: Changes are applied automatically via database triggers
- **Backward Compatibility**: Existing data continues to work without issues

## Usage Notes
- Guests, drivers, and other participant types will not generate billing entries
- Product rules can be configured per participant type
- Changes take effect immediately when participants are modified
- The system maintains audit trails and proper data integrity