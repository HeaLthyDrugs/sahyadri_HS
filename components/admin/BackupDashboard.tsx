'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Backup {
  name: string;
  timestamp: string;
  fileSize: string;
  driveUrl?: string;
  folderUrl?: string;
  tableCount?: number;
}

// Sample data for UI - this would be replaced with actual API calls
const SAMPLE_BACKUPS: Backup[] = [];

export default function BackupDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingConfig, setCheckingConfig] = useState(false);
  const [backups, setBackups] = useState<Backup[]>(SAMPLE_BACKUPS);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [backupSchedule, setBackupSchedule] = useState('daily');
  
  // Function to test the backup configuration
  const testBackupConfig = async () => {
    setCheckingConfig(true);
    try {
      const response = await fetch('/api/backup/check');
      const data = await response.json();
      
      if (response.ok && data.configured) {
        toast({
          title: 'Configuration successful',
          description: `Connected to Google Drive folder: ${data.googleDrive?.folderName || 'Unknown folder'}`,
        });
      } else {
        toast({
          title: 'Configuration issues detected',
          description: Array.isArray(data.errors) ? data.errors.join('. ') : 'Unknown configuration error',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Config check error:', error);
      toast({
        title: 'Configuration check failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setCheckingConfig(false);
    }
  };
  
  // Function to trigger a manual backup
  const triggerManualBackup = async () => {
    setLoading(true);
    try {
      toast({
        title: 'Backup started',
        description: 'Your database backup has been initiated. This may take a few minutes.',
      });
      
      // Call the actual backup API
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // We'll need to get an API key for production use
          'Authorization': 'Bearer ' + (process.env.NEXT_PUBLIC_BACKUP_API_KEY || 'changeme')
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create backup');
      }
      
      const data = await response.json();
      
      toast({
        title: 'Backup completed',
        description: `Backup complete with ${data.count || 0} tables. Your data is now safely stored.`,
      });
      
      // Refresh the backup list
      fetchBackups();
    } catch (error) {
      console.error('Backup error:', error);
      toast({
        title: 'Backup failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Function to toggle scheduled backups
  const toggleScheduledBackups = (enabled: boolean) => {
    setScheduleEnabled(enabled);
    
    // This would call an API to actually enable/disable scheduled backups
    
    toast({
      title: enabled ? 'Scheduled backups enabled' : 'Scheduled backups disabled',
      description: enabled 
        ? `Backups will run ${backupSchedule} automatically` 
        : 'Automatic backups have been turned off',
    });
  };
  
  // Function to change backup schedule
  const changeBackupSchedule = (schedule: string) => {
    setBackupSchedule(schedule);
    
    // This would call an API to actually update the backup schedule
    
    if (scheduleEnabled) {
      toast({
        title: 'Backup schedule updated',
        description: `Backups will now run ${schedule}`,
      });
    }
  };
  
  // Function to fetch backup history
  const fetchBackups = async () => {
    try {
      const response = await fetch('/api/backup', {
        headers: {
          'Authorization': 'Bearer ' + (process.env.NEXT_PUBLIC_BACKUP_API_KEY || 'changeme')
        }
      });
      
      if (!response.ok) {
        console.error('Failed to fetch backups:', response.statusText);
        return;
      }
      
      const data = await response.json();
      if (data.backups && Array.isArray(data.backups)) {
        // Transform the data to match the Backup interface
        const formattedBackups: Backup[] = data.backups.map((backup: string) => {
          const parts = backup.split('_');
          const date = parts[0];
          const time = parts.length > 1 ? parts[1].replace(/-/g, ':') : '';
          
          return {
            name: backup,
            timestamp: new Date(`${date}T${time}`).toLocaleString(),
            fileSize: 'Multiple files',
            driveUrl: '#',
            folderUrl: '#',
            tableCount: 0
          };
        });
        
        setBackups(formattedBackups);
      }
    } catch (error) {
      console.error('Error fetching backups:', error);
    }
  };
  
  // Fetch backup history on component mount
  useEffect(() => {
    fetchBackups();
  }, []);
  
  return (
    <Tabs defaultValue="manage" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-8">
        <TabsTrigger value="manage">Manage Backups</TabsTrigger>
        <TabsTrigger value="schedule">Schedule</TabsTrigger>
        <TabsTrigger value="history">Backup History</TabsTrigger>
      </TabsList>
      
      <TabsContent value="manage">
        <Card>
          <CardHeader>
            <CardTitle>Manual Backup</CardTitle>
            <CardDescription>
              Create a manual backup of your database and upload it to Google Drive.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              This will create a structured backup of all your Supabase data and upload it to the configured Google Drive account.
              Each table will be stored in a separate file for easier access and restoration.
            </p>
            <div className="mb-4">
              <Button 
                variant="outline" 
                onClick={testBackupConfig}
                disabled={checkingConfig}
                className="mr-2"
              >
                {checkingConfig ? 'Checking...' : 'Test Configuration'}
              </Button>
              <span className="text-xs text-muted-foreground">
                Check if your Google Drive backup is properly configured
              </span>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={triggerManualBackup} 
              disabled={loading}
            >
              {loading ? 'Creating Backup...' : 'Create Backup Now'}
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>
      
      <TabsContent value="schedule">
        <Card>
          <CardHeader>
            <CardTitle>Scheduled Backups</CardTitle>
            <CardDescription>
              Configure automatic database backups to Google Drive.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="schedule-switch">Enable scheduled backups</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically backup your database on a regular schedule
                </p>
              </div>
              <Switch
                id="schedule-switch"
                checked={scheduleEnabled}
                onCheckedChange={toggleScheduledBackups}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="backup-frequency">Backup frequency</Label>
              <Select
                disabled={!scheduleEnabled}
                value={backupSchedule}
                onValueChange={changeBackupSchedule}
              >
                <SelectTrigger id="backup-frequency" className="w-full">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily (Midnight UTC)</SelectItem>
                  <SelectItem value="weekly">Weekly (Sunday)</SelectItem>
                  <SelectItem value="monthly">Monthly (1st day)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="history">
        <Card>
          <CardHeader>
            <CardTitle>Backup History</CardTitle>
            <CardDescription>
              View and manage your previous database backups.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {backups.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No backup history found. Create your first backup to see it here.
              </p>
            ) : (
              <div className="border rounded-md divide-y">
                {backups.map((backup, index) => (
                  <div key={index} className="p-4 flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{backup.name}</h3>
                      <p className="text-sm text-muted-foreground">{backup.timestamp}</p>
                      <p className="text-xs text-muted-foreground">
                        {backup.tableCount ? `${backup.tableCount} tables` : backup.fileSize}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {backup.folderUrl && backup.folderUrl !== '#' && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={backup.folderUrl} target="_blank" rel="noopener noreferrer">
                            View in Drive
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
} 