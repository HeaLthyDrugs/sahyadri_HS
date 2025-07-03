# Invoice and Monthly Report Integration

## Overview
The invoice functionality has been updated to fetch data exactly like the Monthly Report component, ensuring that the total amounts match perfectly between both systems.

## Key Changes Made

### 1. Invoice API Route (`/app/api/invoice/route.ts`)
- **Updated data fetching approach**: Now uses the same methodology as Monthly Report
- **Program Month Mapping**: Uses `program_month_mappings` table to get correct programs for billing month
- **Staff Entries**: Fetches based on date range (month start to end) just like Monthly Report
- **Data Aggregation**: Aggregates both program and staff entries by product ID
- **Removed type parameter**: Now always fetches combined data (both program and staff entries)

#### Data Flow:
1. Get program mappings for the billing month from `program_month_mappings`
2. Fetch program billing entries using mapped program IDs and specific package ID
3. Fetch staff billing entries using date range and specific package ID
4. Aggregate both sources by product ID to get total quantities
5. Calculate final amounts using product rates

### 2. Invoice Frontend Components

#### Invoice Page (`/app/dashboard/billing/invoice/page.tsx`)
- **Updated API call**: Always sends `type: 'combined'` to match Monthly Report approach
- **Updated descriptions**: Clarified that invoice is based on Monthly Report data

#### Invoice Form (`/components/admin/pages/billing/invoice-form.tsx`)
- **Updated description**: Clarified the data sourcing methodology

#### Invoice Preview (`/components/admin/pages/billing/invoice-preview.tsx`)
- **Enhanced summary section**: Added detailed explanation of data sources
- **Clarified data matching**: Explicitly states that total amount matches Monthly Report

## Data Matching Verification

### Monthly Report Approach:
1. Uses `program_month_mappings` to get programs for billing month
2. Fetches billing entries for mapped programs
3. Fetches staff entries for date range
4. Aggregates by program and calculates totals

### Invoice Approach (Now Updated):
1. Uses `program_month_mappings` to get programs for billing month ✅
2. Fetches billing entries for mapped programs ✅
3. Fetches staff entries for date range ✅
4. Aggregates by product and calculates totals ✅

## Key Database Tables Used

### Program Month Mapping
- **Table**: `program_month_mappings`
- **Purpose**: Maps programs to specific billing months
- **Usage**: Determines which programs' billing entries to include for a given month

### Billing Entries
- **Table**: `billing_entries`
- **Filtering**: By program IDs (from mapping) and package ID
- **Purpose**: Program-based consumption data

### Staff Billing Entries
- **Table**: `staff_billing_entries`
- **Filtering**: By date range and package ID
- **Purpose**: Staff consumption data for the month

## Benefits

1. **Consistency**: Invoice totals now match Monthly Report totals exactly
2. **Accuracy**: Uses the same data sources and logic as reporting
3. **Reliability**: Eliminates discrepancies between invoice and report amounts
4. **Transparency**: Clear documentation of data sources in UI

## Usage

1. Select a package (Normal, Extra, Cold Drink)
2. Select a billing month
3. System fetches:
   - Program entries based on month mapping
   - Staff entries based on date range
4. Aggregates data by product
5. Generates invoice with matching Monthly Report totals

## Debugging

The invoice API includes comprehensive debug logging to verify:
- Program mappings found
- Entries processed from both sources
- Final aggregated quantities and amounts
- Total calculation breakdown

This ensures transparency and makes it easy to verify data consistency between Invoice and Monthly Report systems.
