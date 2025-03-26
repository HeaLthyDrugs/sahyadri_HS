import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import { getGoogleDriveClient } from './googleDriveConfig';

export interface UploadOptions {
  folderPath: string;
  parentFolderId?: string;
}

interface UploadResult {
  mainFolderId: string;
  folderUrl?: string;
  files: {
    name: string;
    id: string;
    path: string;
  }[];
}

/**
 * Uploads a folder structure to Google Drive
 */
export const uploadToGoogleDrive = async (options: UploadOptions): Promise<UploadResult> => {
  const { folderPath, parentFolderId } = options;
  
  // Validate folder exists
  if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
    throw new Error(`Folder not found or not a directory: ${folderPath}`);
  }

  // Get Google Drive client
  const { drive, folderId: defaultParentFolderId } = getGoogleDriveClient();
  
  // Use provided parentFolderId or default from config
  const targetParentFolderId = parentFolderId || defaultParentFolderId;
  
  // Get folder name from path
  const folderName = path.basename(folderPath);
  
  console.log(`Uploading backup folder ${folderName} to Google Drive...`);
  
  // Create a result object to track uploaded files
  const result: UploadResult = {
    mainFolderId: '',
    files: []
  };
  
  try {
    // First, create the main backup folder
    const mainFolderResponse = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [targetParentFolderId],
      }
    });
    
    if (!mainFolderResponse.data.id) {
      throw new Error('Failed to create main backup folder');
    }
    
    result.mainFolderId = mainFolderResponse.data.id;
    
    // Get a viewable link for the main folder
    const folderViewResponse = await drive.files.get({
      fileId: result.mainFolderId,
      fields: 'webViewLink'
    });
    
    result.folderUrl = folderViewResponse.data.webViewLink || undefined;
    
    // Upload all files in the root of the backup folder
    const rootFiles = fs.readdirSync(folderPath)
      .filter(item => {
        const itemPath = path.join(folderPath, item);
        return fs.statSync(itemPath).isFile();
      });
    
    for (const file of rootFiles) {
      const filePath = path.join(folderPath, file);
      const fileResponse = await uploadFile(drive, filePath, result.mainFolderId);
      
      result.files.push({
        name: file,
        id: fileResponse.id,
        path: '/'
      });
    }
    
    // Check if there's a tables directory
    const tablesPath = path.join(folderPath, 'tables');
    if (fs.existsSync(tablesPath) && fs.statSync(tablesPath).isDirectory()) {
      // Create a tables folder in Drive
      const tablesFolderResponse = await drive.files.create({
        requestBody: {
          name: 'tables',
          mimeType: 'application/vnd.google-apps.folder',
          parents: [result.mainFolderId],
        }
      });
      
      if (!tablesFolderResponse.data.id) {
        throw new Error('Failed to create tables folder');
      }
      
      const tablesFolderId = tablesFolderResponse.data.id;
      
      // Upload all table files
      const tableFiles = fs.readdirSync(tablesPath)
        .filter(item => {
          const itemPath = path.join(tablesPath, item);
          return fs.statSync(itemPath).isFile();
        });
      
      for (const file of tableFiles) {
        const filePath = path.join(tablesPath, file);
        const fileResponse = await uploadFile(drive, filePath, tablesFolderId);
        
        result.files.push({
          name: file,
          id: fileResponse.id,
          path: '/tables'
        });
      }
    }
    
    // Share the main folder with the target email
    try {
      const { targetEmail } = getGoogleDriveClient();
      await drive.permissions.create({
        fileId: result.mainFolderId,
        requestBody: {
          role: 'reader',
          type: 'user',
          emailAddress: targetEmail,
        },
      });
      console.log(`Shared backup folder with ${targetEmail}`);
    } catch (shareError) {
      console.error('Error sharing folder:', shareError);
      // Continue execution even if sharing fails
    }
    
    console.log(`Backup folder uploaded successfully. Folder ID: ${result.mainFolderId}`);
    console.log(`Folder can be accessed at: ${result.folderUrl}`);
    
    return result;
  } catch (error) {
    console.error('Error uploading backup to Google Drive:', error);
    throw error;
  }
};

/**
 * Helper function to upload a single file to Google Drive
 */
async function uploadFile(drive: any, filePath: string, parentId: string) {
  const fileName = path.basename(filePath);
  const mimeType = getMimeType(fileName);
  
  console.log(`Uploading file: ${fileName}`);
  
  // Create a readable stream for the file
  const fileStream = fs.createReadStream(filePath);
  
  // Upload file to Google Drive
  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [parentId],
    },
    media: {
      mimeType,
      body: fileStream,
    },
  });
  
  if (!response.data.id) {
    throw new Error(`Failed to upload file: ${fileName}`);
  }
  
  return {
    id: response.data.id,
    name: fileName
  };
}

/**
 * Helper function to get MIME type based on file extension
 */
function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  
  switch (ext) {
    case '.json':
      return 'application/json';
    case '.md':
      return 'text/markdown';
    case '.txt':
      return 'text/plain';
    case '.csv':
      return 'text/csv';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
} 