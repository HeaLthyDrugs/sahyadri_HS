import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Tables to backup - add any additional tables you want to include
const TABLES_TO_BACKUP = [
  'programs',
  'packages',
  'products',
  'billing_entries',
  'participants',
  'staff',
  'staff_types',
  'product_rules',
  // Add more tables as needed
];

export interface BackupOptions {
  outputDir: string;
  folderName?: string;
  createSeparateFiles?: boolean;
}

/**
 * Creates a backup of Supabase data with proper structure
 */
export const createSupabaseBackup = async (options: BackupOptions): Promise<string> => {
  // Extract options with defaults
  const {
    outputDir,
    folderName = `backup-${new Date().toISOString().replace(/:/g, '-')}`,
    createSeparateFiles = true
  } = options;

  // Create supabase client with service role key (needed for admin operations)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined');
  }

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('Starting Supabase backup...');

  // Create the backup directory structure
  const backupDir = path.join(outputDir, folderName);
  const tablesDir = path.join(backupDir, 'tables');

  // Ensure output directories exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  if (createSeparateFiles && !fs.existsSync(tablesDir)) {
    fs.mkdirSync(tablesDir, { recursive: true });
  }

  // Fetch data from each table
  const backupData: Record<string, any[]> = {};
  const counts: Record<string, number> = {};
  
  for (const table of TABLES_TO_BACKUP) {
    try {
      console.log(`Backing up table: ${table}`);
      const { data, error } = await supabase.from(table).select('*');
      
      if (error) {
        console.error(`Error backing up table ${table}:`, error.message);
        // Continue with other tables even if one fails
        backupData[table] = [];
        counts[table] = 0;
      } else {
        const tableData = data || [];
        backupData[table] = tableData;
        counts[table] = tableData.length;
        console.log(`${table}: ${tableData.length} records backed up`);
        
        // If separate files option is enabled, write each table to its own file
        if (createSeparateFiles) {
          const tableFilePath = path.join(tablesDir, `${table}.json`);
          fs.writeFileSync(
            tableFilePath, 
            JSON.stringify({ 
              metadata: { 
                table, 
                count: tableData.length,
                timestamp: new Date().toISOString()
              },
              data: tableData
            }, null, 2)
          );
        }
      }
    } catch (err) {
      console.error(`Exception backing up table ${table}:`, err);
      backupData[table] = [];
      counts[table] = 0;
    }
  }

  // Generate metadata
  const metadata = {
    timestamp: new Date().toISOString(),
    tables: TABLES_TO_BACKUP,
    counts,
    backupType: createSeparateFiles ? 'structured' : 'single-file'
  };

  // Write metadata file
  const metadataFilePath = path.join(backupDir, 'metadata.json');
  fs.writeFileSync(metadataFilePath, JSON.stringify(metadata, null, 2));

  // If not using separate files, also create a combined file for convenience
  if (!createSeparateFiles) {
    const fullBackup = {
      metadata,
      data: backupData,
    };

    const combinedFilePath = path.join(backupDir, 'full-backup.json');
    fs.writeFileSync(combinedFilePath, JSON.stringify(fullBackup, null, 2));
  }

  // Create a README file with instructions
  const readmeContent = `# SHS Dashboard Backup
Created: ${new Date().toISOString()}

## Backup Structure
- metadata.json: Contains information about this backup
${createSeparateFiles ? '- tables/: Directory containing individual table backups' : '- full-backup.json: Combined backup file with all tables'}

## Tables Included
${TABLES_TO_BACKUP.map(table => `- ${table}: ${counts[table]} records`).join('\n')}

## Restoration
To restore this backup, use the Supabase dashboard or API to import the data.
`;

  fs.writeFileSync(path.join(backupDir, 'README.md'), readmeContent);
  
  console.log(`Backup complete. Written to: ${backupDir}`);
  return backupDir;
}; 