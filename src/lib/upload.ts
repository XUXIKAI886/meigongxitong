import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config';
import { validateImageFile } from './image-utils';

// Ensure upload directory exists
async function ensureUploadDir(): Promise<void> {
  try {
    await fs.access(config.storage.root);
  } catch {
    await fs.mkdir(config.storage.root, { recursive: true });
  }
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await ensureUploadDir();
    cb(null, config.storage.root);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: config.images.maxFileSize,
  },
  fileFilter: (req, file, cb) => {
    try {
      if (!config.images.allowedMimeTypes.includes(file.mimetype)) {
        return cb(new Error('Invalid file type'));
      }
      cb(null, true);
    } catch (error) {
      cb(error as Error);
    }
  },
});

// File management utilities
export class FileManager {
  // Save uploaded file and return URL
  static async saveUploadedFile(file: Express.Multer.File): Promise<{
    filename: string;
    originalname: string;
    mimetype: string;
    size: number;
    path: string;
    url: string;
  }> {
    validateImageFile(file);
    
    const url = `/api/files/${file.filename}`;
    
    return {
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      url,
    };
  }
  
  // Get file path from filename
  static getFilePath(filename: string): string {
    return path.join(config.storage.root, filename);
  }
  
  // Check if file exists
  static async fileExists(filename: string): Promise<boolean> {
    try {
      await fs.access(this.getFilePath(filename));
      return true;
    } catch {
      return false;
    }
  }
  
  // Delete file
  static async deleteFile(filename: string): Promise<void> {
    try {
      await fs.unlink(this.getFilePath(filename));
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as any).code !== 'ENOENT') {
        throw error;
      }
    }
  }
  
  // Save buffer as file
  static async saveBuffer(
    buffer: Buffer,
    originalName: string,
    mimetype: string
  ): Promise<{
    filename: string;
    path: string;
    url: string;
  }> {
    await ensureUploadDir();
    
    const ext = path.extname(originalName);
    const filename = `${uuidv4()}${ext}`;
    const filePath = path.join(config.storage.root, filename);
    
    await fs.writeFile(filePath, buffer);
    
    return {
      filename,
      path: filePath,
      url: `/api/files/${filename}`,
    };
  }
  
  // Get file buffer
  static async getFileBuffer(filename: string): Promise<Buffer> {
    const filePath = this.getFilePath(filename);
    return await fs.readFile(filePath);
  }
  
  // Clean up old files (older than 24 hours)
  static async cleanup(): Promise<void> {
    try {
      const files = await fs.readdir(config.storage.root);
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      
      for (const filename of files) {
        const filePath = this.getFilePath(filename);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < oneDayAgo) {
          await this.deleteFile(filename);
        }
      }
    } catch (error) {
      console.error('Error during file cleanup:', error);
    }
  }
}

// Cleanup interval (run every hour)
if (typeof window === 'undefined') {
  setInterval(() => {
    FileManager.cleanup();
  }, 60 * 60 * 1000);
}
