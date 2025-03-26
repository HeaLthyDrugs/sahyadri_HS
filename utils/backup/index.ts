import path from 'path';
import fs from 'fs';
import { createSupabaseBackup } from './supabaseExporter';
import { uploadToGoogleDrive } from './driveUploader';

// Define backup directory - modify as needed
const BACKUP_DIR = path.join(process.cwd(), 'backups');

export interface BackupResult {
  success: boolean;
  timestamp: string;
  backupPath?: string;
  driveFolderId?: string;
  driveFolderUrl?: string;
  tables?: string[];
  error?: string;
}

/**
 * Main function to run a complete backup
 * 1. Exports Supabase data to structured JSON files
 * 2. Uploads the backup folder to Google Drive
 * 3. Returns results with relevant information
 */
export const runBackup = async (): Promise<BackupResult> => {
  const timestamp = new Date().toISOString();
  const dateFormatted = timestamp.slice(0, 10);
  const timeFormatted = timestamp.slice(11, 19).replace(/:/g, '-');
  
  // Create a folder name for the backup
  const backupFolderName = `${dateFormatted}_${timeFormatted}`;
  
  try {
    console.log(`Starting backup process at ${timestamp}`);
    
    // Step 1: Create Supabase backup with structured files
    const backupPath = await createSupabaseBackup({
      outputDir: BACKUP_DIR,
      folderName: backupFolderName,
      createSeparateFiles: true // Use structured approach with separate files
    });
    
    console.log(`Backup created at: ${backupPath}`);
    
    // Step 2: Upload to Google Drive
    const uploadResult = await uploadToGoogleDrive({
      folderPath: backupPath
    });
    
    console.log('Backup uploaded to Google Drive');
    
    // Get the tables that were backed up by reading the metadata file
    let tables: string[] = [];
    try {
      const metadataPath = path.join(backupPath, 'metadata.json');
      if (fs.existsSync(metadataPath)) {
        const metadataRaw = fs.readFileSync(metadataPath, 'utf8');
        const metadata = JSON.parse(metadataRaw);
        tables = metadata.tables || [];
      }
    } catch (err) {
      console.warn('Could not read tables from metadata:', err);
    }
    
    return {
      success: true,
      timestamp,
      backupPath,
      driveFolderId: uploadResult.mainFolderId,
      driveFolderUrl: uploadResult.folderUrl,
      tables
    };
  } catch (error) {
    console.error('Backup process failed:', error);
    return {
      success: false,
      timestamp,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

/**
 * Utility function to list all available backups
 */
export const listBackups = (): string[] => {
  if (!fs.existsSync(BACKUP_DIR)) {
    return [];
  }
  
  return fs.readdirSync(BACKUP_DIR)
    .filter(item => {
      const fullPath = path.join(BACKUP_DIR, item);
      return fs.statSync(fullPath).isDirectory();
    })
    .sort((a, b) => b.localeCompare(a)); // Sort newest first
}; 