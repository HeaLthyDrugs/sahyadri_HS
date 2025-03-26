import fs from 'fs';
import { getGoogleDriveClient } from './googleDriveConfig';

interface ConfigCheckResult {
  isConfigured: boolean;
  errors: string[];
  googleDriveInfo?: {
    folderName?: string;
    folderUrl?: string;
  };
}

/**
 * Checks if the backup system is properly configured
 * Returns an object with the status and any error messages
 */
export async function checkBackupConfig(): Promise<ConfigCheckResult> {
  const errors: string[] = [];
  
  // Check environment variables
  if (!process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID) {
    errors.push('GOOGLE_DRIVE_BACKUP_FOLDER_ID is not set in environment variables');
  }
  
  if (!process.env.GOOGLE_DRIVE_TARGET_EMAIL) {
    errors.push('GOOGLE_DRIVE_TARGET_EMAIL is not set in environment variables');
  }
  
  // Check service account key file
  const keyFilePath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './service-account-key.json';
  if (!fs.existsSync(keyFilePath)) {
    errors.push(`Service account key file not found at: ${keyFilePath}`);
  } else {
    try {
      // Check if it's valid JSON
      const keyFileContent = fs.readFileSync(keyFilePath, 'utf8');
      const keyData = JSON.parse(keyFileContent);
      
      if (!keyData.client_email) {
        errors.push('Service account key file is missing client_email field');
      }
      
      if (!keyData.private_key) {
        errors.push('Service account key file is missing private_key field');
      }
    } catch (error) {
      errors.push(`Error parsing service account key file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Try to connect to Google Drive and check folder access
  let googleDriveInfo;
  if (errors.length === 0) {
    try {
      const { drive, folderId } = getGoogleDriveClient();
      
      // Try to get folder info
      const folderResponse = await drive.files.get({
        fileId: folderId,
        fields: 'name,webViewLink',
      });
      
      const folderName = folderResponse.data.name ?? undefined;
      const folderUrl = folderResponse.data.webViewLink ?? undefined;
      
      googleDriveInfo = {
        folderName,
        folderUrl,
      };
    } catch (error) {
      if (error instanceof Error) {
        errors.push(`Error connecting to Google Drive: ${error.message}`);
      } else {
        errors.push(`Unknown error connecting to Google Drive: ${String(error)}`);
      }
    }
  }
  
  return {
    isConfigured: errors.length === 0,
    errors,
    googleDriveInfo,
  };
} 