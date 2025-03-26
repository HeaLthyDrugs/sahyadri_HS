import { Metadata } from 'next';
import BackupDashboard from '@/components/admin/BackupDashboard';

export const metadata: Metadata = {
  title: 'Database Backups | SHS Admin Dashboard',
  description: 'Manage database backups and restore operations',
};

export default function BackupsPage() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Database Backups</h1>
      </div>

      <BackupDashboard />
    </div>
  );
} 