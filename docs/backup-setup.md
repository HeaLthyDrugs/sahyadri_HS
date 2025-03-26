# SHS Dashboard Backup System Setup

This document explains how to set up the automatic database backup system that backs up your Supabase data to Google Drive.

## Prerequisites

1. A Google account that will be used to store backups
2. The SHS Dashboard application running

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Enable the Google Drive API for your project

## Step 2: Create a Service Account

1. In your Google Cloud Project, go to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Give it a name like "shs-backup-service"
4. Grant it the following roles:
   - `Drive API > Drive File Creator`
   - `Drive API > Drive Metadata Reader`
5. Create and download a JSON key for this service account
6. Save this JSON file as `service-account-key.json` in the root of your project

## Step 3: Create a Google Drive Folder for Backups

1. Go to your Google Drive
2. Create a new folder called "SHS Dashboard Backups"
3. Right-click the folder and select "Share"
4. Share it with the email address of your service account (found in the JSON key file) with Editor permissions
5. Note the folder ID from the URL (it's the long string after `/folders/` in the URL)

## Step 4: Update Environment Variables

Add the following variables to your `.env.local` file:

```
# Google Drive Backup Configuration
GOOGLE_DRIVE_BACKUP_FOLDER_ID=your_folder_id_here
GOOGLE_DRIVE_TARGET_EMAIL=your_email@example.com
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./service-account-key.json
BACKUP_API_KEY=create_a_secure_random_string_here
```

## Step 5: Test the Backup System

Run a manual backup to test the setup:

```bash
npm run backup
```

If successful, you should see a JSON file in your Google Drive folder.

## Running Backups

### Manual Backups

To run a manual backup:

```bash
npm run backup
```

### Scheduled Backups

To set up scheduled backups, you have several options:

1. **Using the Admin UI**:
   - Go to `/admin/backups` in your application
   - Use the scheduling interface

2. **Using a Server-Side Cron Job**:
   - If your hosting provider supports it, set up a cron job to run the backup script
   - Example for daily backups at midnight: `0 0 * * * cd /path/to/app && npm run backup`

3. **Using an External Service**:
   - Use a service like GitHub Actions, AWS Lambda, or similar to trigger the backup API endpoint

## API Endpoints

The backup system exposes the following API endpoints:

- `POST /api/backup`: Triggers a backup
  - Requires `Authorization: Bearer YOUR_BACKUP_API_KEY` header
  - Returns backup details if successful

- `GET /api/backup`: Lists available backups
  - Requires `Authorization: Bearer YOUR_BACKUP_API_KEY` header
  - Returns a list of backups

## Security Considerations

- Keep your `service-account-key.json` and `.env.local` file secure
- Use a strong random string for `BACKUP_API_KEY`
- Consider restricting API access to specific IP addresses if possible

## Backup File Structure

The backup JSON files have the following structure:

```json
{
  "metadata": {
    "timestamp": "2023-01-01T00:00:00.000Z",
    "tables": ["programs", "packages", "products", ...],
    "counts": {
      "programs": 42,
      "packages": 15,
      ...
    }
  },
  "data": {
    "programs": [ /* program records */ ],
    "packages": [ /* package records */ ],
    ...
  }
}
```

## Troubleshooting

If you encounter issues:

1. Check that your service account has proper permissions
2. Verify the folder ID is correct
3. Ensure your environment variables are properly set
4. Check the application logs for error messages

## Extending the Backup System

To add more tables to the backup:

1. Edit `utils/backup/supabaseExporter.ts`
2. Add your table names to the `TABLES_TO_BACKUP` array 