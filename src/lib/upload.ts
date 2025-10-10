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
    mimetype: string,
    usePublicGenerated = false  // 新参数：是否使用public/generated目录
  ): Promise<{
    filename: string;
    path: string;
    url: string;
  }> {
    const ext = path.extname(originalName);
    const filename = `${uuidv4()}${ext}`;

    let targetDir: string;
    let url: string;

    if (usePublicGenerated) {
      // 使用public/generated目录 - 统一存储方案
      targetDir = path.join(process.cwd(), 'public', 'generated');
      url = `/generated/${filename}`;  // 直接静态访问
    } else {
      // 使用原有.uploads目录 - 向后兼容
      await ensureUploadDir();
      targetDir = config.storage.root;
      url = `/api/files/${filename}`;
    }

    // 确保目标目录存在
    try {
      await fs.access(targetDir);
    } catch {
      await fs.mkdir(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, filename);
    await fs.writeFile(filePath, buffer);

    return {
      filename,
      path: filePath,
      url,
    };
  }
  
  // Get file buffer
  static async getFileBuffer(filename: string): Promise<Buffer> {
    const filePath = this.getFilePath(filename);
    return await fs.readFile(filePath);
  }
  
  // 自动清理过期文件（7天前的文件）
  static async cleanup(): Promise<void> {
    try {
      console.log('🧹 开始自动清理任务：删除7天前的文件...');

      // 清理.uploads目录
      await this.cleanupDirectory(config.storage.root, '/api/files/', 7);

      // 清理public/generated目录
      const publicGeneratedDir = path.join(process.cwd(), 'public', 'generated');
      await this.cleanupDirectory(publicGeneratedDir, '/generated/', 7);

      console.log('✅ 自动清理任务完成');
    } catch (error) {
      console.error('❌ 自动清理失败:', error);
    }
  }

  // 统一目录清理方法
  private static async cleanupDirectory(dirPath: string, urlPrefix: string, maxAgeDays: number = 7): Promise<void> {
    try {
      const files = await fs.readdir(dirPath);
      const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
      const now = Date.now();
      let deletedCount = 0;
      let totalSize = 0;

      for (const filename of files) {
        const filePath = path.join(dirPath, filename);
        const stats = await fs.stat(filePath);
        const fileAge = now - stats.mtimeMs;

        if (fileAge > maxAgeMs) {
          const ageDays = Math.floor(fileAge / (24 * 60 * 60 * 1000));
          const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

          await fs.unlink(filePath);
          deletedCount++;
          totalSize += stats.size;

          console.log(`  ✅ 删除: ${urlPrefix}${filename} (${ageDays}天前, ${sizeMB}MB)`);
        }
      }

      if (deletedCount > 0) {
        const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
        console.log(`  📊 ${dirPath}: 删除${deletedCount}个文件, 释放${totalSizeMB}MB空间`);
      }
    } catch (error) {
      // 目录不存在或其他错误，忽略
      if ((error as any).code !== 'ENOENT') {
        console.error(`清理目录 ${dirPath} 失败:`, error);
      }
    }
  }

  // 手动清理所有生成图片的方法（全部删除 - 谨慎使用）
  static async cleanupAllGenerated(): Promise<{
    uploadsDeleted: number;
    generatedDeleted: number;
    totalSize: number;
  }> {
    let uploadsDeleted = 0;
    let generatedDeleted = 0;
    let totalSize = 0;

    // 清理.uploads目录
    try {
      const uploadsFiles = await fs.readdir(config.storage.root);
      for (const filename of uploadsFiles) {
        const filePath = path.join(config.storage.root, filename);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
        await fs.unlink(filePath);
        uploadsDeleted++;
      }
    } catch (error) {
      // 忽略目录不存在的错误
    }

    // 清理public/generated目录
    try {
      const publicGeneratedDir = path.join(process.cwd(), 'public', 'generated');
      const generatedFiles = await fs.readdir(publicGeneratedDir);
      for (const filename of generatedFiles) {
        const filePath = path.join(publicGeneratedDir, filename);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
        await fs.unlink(filePath);
        generatedDeleted++;
      }
    } catch (error) {
      // 忽略目录不存在的错误
    }

    return {
      uploadsDeleted,
      generatedDeleted,
      totalSize: Math.round(totalSize / 1024 / 1024 * 100) / 100 // MB
    };
  }

  // 智能清理：删除指定天数之前的文件（推荐使用）
  static async cleanupOldFiles(maxAgeDays: number = 7): Promise<{
    uploadsDeleted: number;
    generatedDeleted: number;
    totalSize: number;
    details: Array<{ file: string; ageDays: number; sizeMB: number }>;
  }> {
    let uploadsDeleted = 0;
    let generatedDeleted = 0;
    let totalSize = 0;
    const details: Array<{ file: string; ageDays: number; sizeMB: number }> = [];

    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const now = Date.now();

    // 清理.uploads目录中的过期文件
    try {
      const uploadsFiles = await fs.readdir(config.storage.root);
      for (const filename of uploadsFiles) {
        const filePath = path.join(config.storage.root, filename);
        const stats = await fs.stat(filePath);
        const fileAge = now - stats.mtimeMs;

        if (fileAge > maxAgeMs) {
          const ageDays = Math.floor(fileAge / (24 * 60 * 60 * 1000));
          const sizeMB = Math.round(stats.size / 1024 / 1024 * 100) / 100;

          await fs.unlink(filePath);
          uploadsDeleted++;
          totalSize += stats.size;

          details.push({
            file: `.uploads/${filename}`,
            ageDays,
            sizeMB
          });

          console.log(`✅ 删除过期文件: .uploads/${filename} (${ageDays}天前, ${sizeMB}MB)`);
        }
      }
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        console.error('清理.uploads目录失败:', error);
      }
    }

    // 清理public/generated目录中的过期文件
    try {
      const publicGeneratedDir = path.join(process.cwd(), 'public', 'generated');
      const generatedFiles = await fs.readdir(publicGeneratedDir);

      for (const filename of generatedFiles) {
        const filePath = path.join(publicGeneratedDir, filename);
        const stats = await fs.stat(filePath);
        const fileAge = now - stats.mtimeMs;

        if (fileAge > maxAgeMs) {
          const ageDays = Math.floor(fileAge / (24 * 60 * 60 * 1000));
          const sizeMB = Math.round(stats.size / 1024 / 1024 * 100) / 100;

          await fs.unlink(filePath);
          generatedDeleted++;
          totalSize += stats.size;

          details.push({
            file: `public/generated/${filename}`,
            ageDays,
            sizeMB
          });

          console.log(`✅ 删除过期文件: public/generated/${filename} (${ageDays}天前, ${sizeMB}MB)`);
        }
      }
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        console.error('清理public/generated目录失败:', error);
      }
    }

    const totalSizeMB = Math.round(totalSize / 1024 / 1024 * 100) / 100;

    console.log(`\n📊 清理完成: 删除${uploadsDeleted + generatedDeleted}个文件, 释放${totalSizeMB}MB空间`);

    return {
      uploadsDeleted,
      generatedDeleted,
      totalSize: totalSizeMB,
      details
    };
  }
}

// 自动清理定时任务：每天凌晨3点执行一次，清理7天前的文件
if (typeof window === 'undefined') {
  // 立即执行一次清理（服务器启动时）
  FileManager.cleanup().catch(err => {
    console.error('初始清理失败:', err);
  });

  // 每24小时执行一次清理
  setInterval(() => {
    FileManager.cleanup();
  }, 24 * 60 * 60 * 1000); // 24小时 = 86400000毫秒

  console.log('✅ 文件自动清理系统已启动：每24小时清理一次，删除7天前的过期文件');
}
