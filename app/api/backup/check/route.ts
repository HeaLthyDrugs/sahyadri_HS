import { NextRequest, NextResponse } from 'next/server';
import { checkBackupConfig } from '@/utils/backup/checkConfig';

/**
 * GET: Check backup configuration
 */
export async function GET(request: NextRequest) {
  try {
    // Check backup configuration
    const configStatus = await checkBackupConfig();
    
    if (!configStatus.isConfigured) {
      return NextResponse.json({
        configured: false,
        errors: configStatus.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      configured: true,
      googleDrive: configStatus.googleDriveInfo
    });
  } catch (error) {
    console.error('Error checking backup configuration:', error);
    return NextResponse.json(
      { error: 'Failed to check backup configuration' },
      { status: 500 }
    );
  }
} 