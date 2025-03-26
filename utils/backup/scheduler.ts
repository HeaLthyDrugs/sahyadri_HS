import { CronJob } from 'cron';
import { runBackup } from './index';

// Define backup schedules
export const BACKUP_SCHEDULES = {
  DAILY: '0 0 * * *',      // Every day at midnight
  WEEKLY: '0 0 * * 0',     // Every Sunday at midnight
  MONTHLY: '0 0 1 * *',    // First day of month at midnight
  HOURLY: '0 * * * *',     // Every hour
};

let activeJob: CronJob | null = null;
let isJobRunning = false;

/**
 * Start a scheduled backup job
 * @param cronSchedule - Cron expression (e.g. '0 0 * * *' for daily at midnight)
 * @param onComplete - Optional callback after backup completes
 * @returns The active CronJob instance
 */
export function startScheduledBackups(
  cronSchedule: string = BACKUP_SCHEDULES.DAILY,
  onComplete?: (success: boolean) => void
): CronJob {
  // Stop any existing job
  if (activeJob) {
    activeJob.stop();
    isJobRunning = false;
  }
  
  // Create a new cron job
  activeJob = new CronJob(
    cronSchedule,
    async function() {
      console.log(`Running scheduled backup at ${new Date().toISOString()}`);
      try {
        const result = await runBackup();
        console.log(`Scheduled backup completed with status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
        
        if (onComplete) {
          onComplete(result.success);
        }
      } catch (error) {
        console.error('Error during scheduled backup:', error);
        if (onComplete) {
          onComplete(false);
        }
      }
    },
    null, // onComplete
    true, // start
    'UTC' // timezone
  );
  
  isJobRunning = true;
  console.log(`Scheduled backup job started with schedule: ${cronSchedule}`);
  return activeJob;
}

/**
 * Stop the currently running backup schedule if any
 */
export function stopScheduledBackups(): boolean {
  if (activeJob) {
    activeJob.stop();
    activeJob = null;
    isJobRunning = false;
    console.log('Scheduled backup job stopped');
    return true;
  }
  return false;
}

/**
 * Check if a scheduled backup job is running
 */
export function isBackupScheduleActive(): boolean {
  return activeJob !== null && isJobRunning;
}

/**
 * Get the current backup schedule if active
 */
export function getCurrentBackupSchedule(): string | null {
  return activeJob ? activeJob.cronTime.toString() : null;
} 