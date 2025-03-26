import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

// Remove any query parameters if present from folder ID
let BACKUP_FOLDER_ID = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID || '';
if (BACKUP_FOLDER_ID.includes('?')) {
  BACKUP_FOLDER_ID = BACKUP_FOLDER_ID.split('?')[0];
}

// Email of the Google account that owns the Drive to backup to
const TARGET_EMAIL = process.env.GOOGLE_DRIVE_TARGET_EMAIL;

/**
 * Creates and authorizes a Google Drive client
 */
export const getGoogleDriveClient = () => {
  // For production deployments (like Vercel), we'll use the environment variable directly
  const useEnvCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  
  let auth;
  
  if (useEnvCredentials) {
    // Use the credentials from environment variable
    try {
      const credentials = JSON.parse(useEnvCredentials);
      auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive'],
      });
    } catch (error) {
      throw new Error(`Failed to parse service account credentials: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    // Fallback to file-based credentials for local development
    const keyFilePath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 
      path.join(process.cwd(), 'service-account-key.json');
      
    if (!fs.existsSync(keyFilePath)) {
      throw new Error('Google Service Account key file not found: ' + keyFilePath);
    }
    
    auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
  }

  if (!BACKUP_FOLDER_ID) {
    throw new Error('GOOGLE_DRIVE_BACKUP_FOLDER_ID environment variable is not set');
  }

  if (!TARGET_EMAIL) {
    throw new Error('GOOGLE_DRIVE_TARGET_EMAIL environment variable is not set');
  }

  const drive = google.drive({ version: 'v3', auth });
  
  return {
    drive,
    folderId: BACKUP_FOLDER_ID,
    targetEmail: TARGET_EMAIL
  };
}; 