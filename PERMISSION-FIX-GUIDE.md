# Permission System Fix Guide

## Problem Identified

The permission system is not working properly because:

1. **Missing or incomplete role assignments** - Users don't have proper roles assigned
2. **Missing permissions data** - The permissions table is empty or incomplete
3. **Permission checking logic issues** - The hooks are not properly handling edge cases

## Solutions Implemented

### 1. Automatic Permission System Fix

**Component**: `PermissionSystemFix.tsx`
- Automatically detects permission system issues
- Shows a modal when problems are detected
- Provides one-click fix functionality

### 2. Debug API Endpoints

**Endpoint**: `/api/debug-permissions`
- GET request to check current user's permissions
- Shows detailed debugging information
- Helps identify what's missing

**Endpoint**: `/api/init-permissions`
- POST request to initialize the permission system
- Creates default roles and permissions
- Assigns first user as Owner

### 3. Permission Test Page

**Page**: `/dashboard/permission-test`
- Visual interface to debug permissions
- Shows current user, role, and permissions
- Allows manual system initialization

### 4. Command Line Script

**Script**: `scripts/fix-permissions.js`
- Node.js script to initialize permissions from command line
- Uses service role key for admin access
- Can be run independently of the web interface

### 5. Enhanced Permission Hooks

**Updated**: `use-strict-permissions.ts`
- Added better error handling
- Added debugging console logs
- Improved edge case handling

## How to Fix the Permission System

### Option 1: Automatic Fix (Recommended)

1. **Login to the dashboard** - The system will automatically detect permission issues
2. **Click "Fix Now"** when the permission fix modal appears
3. **Wait for completion** - The system will initialize roles and permissions
4. **Page will refresh** - New permissions will be applied

### Option 2: Manual API Call

1. **Open browser developer tools**
2. **Go to Console tab**
3. **Run this command**:
```javascript
fetch('/api/init-permissions', { method: 'POST' })
  .then(r => r.json())
  .then(console.log)
```
4. **Refresh the page** after successful completion

### Option 3: Command Line Script

1. **Open terminal** in the project directory
2. **Install dependencies** if not already done:
```bash
npm install @supabase/supabase-js dotenv
```
3. **Run the script**:
```bash
node scripts/fix-permissions.js
```
4. **Refresh the browser** after completion

### Option 4: Direct Database Access

1. **Open Supabase Dashboard**
2. **Go to SQL Editor**
3. **Run the SQL script** from `scripts/init-permissions.sql`
4. **Refresh the application**

## Default Roles and Permissions

### Owner Role
- **Full access** to all pages (wildcard permission `*`)
- **Can view and edit** everything
- **First user** is automatically assigned this role

### Admin Role
- **Full access** to all pages (wildcard permission `*`)
- **Can view and edit** everything
- **Same as Owner** but can be assigned to multiple users

### Manager Role
- **Limited access** to most operational pages
- **Can edit**: User management, inventory, consumer data, billing entries
- **Cannot edit**: Reports, some admin functions

### User Role
- **Basic access** to consumer and billing pages
- **Read-only access** to most content
- **Can edit**: Only their own profile

### Viewer Role
- **Read-only access** to basic pages
- **Cannot edit** anything except profile viewing

## Verification Steps

After fixing the permission system:

1. **Check the permission test page**: `/dashboard/permission-test`
2. **Verify your role** is displayed correctly
3. **Confirm permissions** are loaded (should see multiple entries)
4. **Test navigation** - restricted pages should be hidden/accessible based on role
5. **Test edit functionality** - edit buttons should appear/disappear based on permissions

## Troubleshooting

### If the fix doesn't work:

1. **Check browser console** for error messages
2. **Verify environment variables** are set correctly
3. **Check Supabase connection** and database access
4. **Try the command line script** as an alternative
5. **Check database tables** directly in Supabase dashboard

### Common Issues:

- **"Profile not found"** - User profile wasn't created during signup
- **"No role assigned"** - User has profile but no role_id
- **"No permissions"** - Permissions table is empty
- **"Database connection error"** - Check Supabase credentials

## Files Modified/Created

### New Files:
- `components/PermissionSystemFix.tsx` - Auto-fix component
- `app/api/debug-permissions/route.ts` - Debug API
- `app/api/init-permissions/route.ts` - Initialization API
- `app/dashboard/permission-test/page.tsx` - Test interface
- `scripts/fix-permissions.js` - Command line script
- `scripts/init-permissions.sql` - SQL initialization script

### Modified Files:
- `app/dashboard/layout.tsx` - Added auto-fix component
- `hooks/use-strict-permissions.ts` - Enhanced error handling
- `lib/permission-utils.ts` - Added debugging

## Next Steps

1. **Run the fix** using any of the methods above
2. **Test the system** thoroughly with different user roles
3. **Remove debugging logs** from production (optional)
4. **Set up proper user role assignment** workflow for new users
5. **Consider implementing** role-based signup restrictions if needed

The permission system should now work correctly with proper access control for different user roles.