import { NextRequest, NextResponse } from 'next/server';
import { runBackup, listBackups } from '@/utils/backup';
import { createClient } from '@supabase/supabase-js';

// Simple API key auth for backup endpoint
const API_KEY = process.env.BACKUP_API_KEY || 'changeme';

/**
 * Validate API key from the request
 */
function validateApiKey(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  
  const apiKey = authHeader.replace('Bearer ', '');
  return apiKey === API_KEY;
}

/**
 * GET: List available backups
 */
export async function GET(request: NextRequest) {
  // Validate API key
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    const backups = listBackups();
    return NextResponse.json({ 
      backups,
      count: backups.length
    });
  } catch (error) {
    console.error('Error listing backups:', error);
    return NextResponse.json(
      { error: 'Failed to list backups' },
      { status: 500 }
    );
  }
}

/**
 * POST: Trigger a new backup
 */
export async function POST(request: NextRequest) {
  // Validate API key
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    // Run the backup process
    const result = await runBackup();
    
    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      timestamp: result.timestamp,
      backupPath: result.backupPath,
      driveFolderId: result.driveFolderId,
      driveUrl: result.driveFolderUrl,
      tables: result.tables,
      count: result.tables?.length || 0
    });
  } catch (error) {
    console.error('Error triggering backup:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 