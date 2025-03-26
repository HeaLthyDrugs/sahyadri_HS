#!/usr/bin/env node
import dotenv from 'dotenv';
import path from 'path';
import { runBackup } from '../utils/backup';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * Run a backup process from the command line
 */
async function main() {
  console.log('Starting SHS Dashboard backup process...');

  try {
    const result = await runBackup();
    
    if (result.success) {
      console.log('=========================');
      console.log('Backup completed successfully!');
      console.log('=========================');
      console.log(`Timestamp: ${result.timestamp}`);
      console.log(`Local backup: ${result.backupFilePath}`);
      console.log(`Google Drive File ID: ${result.driveFileId}`);
      console.log(`Google Drive URL: ${result.driveFileUrl}`);
      process.exit(0);
    } else {
      console.error('=========================');
      console.error('Backup failed!');
      console.error('=========================');
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Unhandled error during backup:', error);
    process.exit(1);
  }
}

// Run the script
main(); 