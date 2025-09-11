import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileValidation } from './validation';
import { FileUploadError } from './errors';

// Enhanced file storage configuration
const createStorage = (uploadPath: string) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      // Generate secure filename with hash
      const fileHash = crypto.randomBytes(16).toString('hex');
      const timestamp = Date.now();
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `${timestamp}-${fileHash}-${sanitizedName}`;
      cb(null, filename);
    },
  });
};

// File filter with enhanced validation
const createFileFilter = () => {
  return (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    try {
      // Check file size (will be checked again by multer limits)
      if (file.size && file.size > fileValidation.maxSize) {
        return cb(new FileUploadError('File size exceeds 10MB limit'));
      }

      // Check MIME type
      if (!fileValidation.allowedTypes.includes(file.mimetype)) {
        return cb(new FileUploadError('Invalid file type. Only PDF, DOC, DOCX, JPG, JPEG, PNG files are allowed'));
      }

      // Check file extension
      const ext = path.extname(file.originalname).toLowerCase();
      if (!fileValidation.allowedExtensions.includes(ext)) {
        return cb(new FileUploadError('Invalid file extension'));
      }

      // Check for suspicious file names
      const suspiciousPatterns = [
        /\.exe$/i,
        /\.bat$/i,
        /\.cmd$/i,
        /\.scr$/i,
        /\.pif$/i,
        /\.com$/i,
        /\.vbs$/i,
        /\.js$/i,
        /\.jar$/i,
      ];

      if (suspiciousPatterns.some(pattern => pattern.test(file.originalname))) {
        return cb(new FileUploadError('File type not allowed for security reasons'));
      }

      cb(null, true);
    } catch (error) {
      cb(new FileUploadError('File validation failed'));
    }
  };
};

// Create multer instance with enhanced configuration
export const createUploadMiddleware = (uploadPath: string = 'uploads') => {
  const fullPath = path.join(process.cwd(), uploadPath);
  
  return multer({
    storage: createStorage(fullPath),
    limits: {
      fileSize: fileValidation.maxSize,
      files: 1, // Only allow one file at a time
      fieldSize: 1024 * 1024, // 1MB for field data
    },
    fileFilter: createFileFilter(),
  });
};

// File processing utilities
export class FileProcessor {
  // Scan file for potential threats (basic implementation)
  static async scanFile(filePath: string): Promise<{ isSafe: boolean; threats?: string[] }> {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const threats: string[] = [];

      // Check for common malware signatures (basic patterns)
      const suspiciousPatterns = [
        /eval\s*\(/i,
        /document\.write/i,
        /<script/i,
        /javascript:/i,
        /vbscript:/i,
        /onload\s*=/i,
        /onerror\s*=/i,
      ];

      const fileContent = fileBuffer.toString('utf8', 0, Math.min(fileBuffer.length, 1024 * 1024)); // Check first 1MB

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(fileContent)) {
          threats.push(`Suspicious pattern detected: ${pattern.source}`);
        }
      }

      // Check file header for expected file types
      const fileHeader = fileBuffer.toString('hex', 0, 8);
      const expectedHeaders: Record<string, string[]> = {
        'pdf': ['25504446'], // %PDF
        'jpg': ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2', 'ffd8ffe3', 'ffd8ffe8'],
        'png': ['89504e47'],
        'doc': ['d0cf11e0'], // Microsoft Office
        'docx': ['504b0304'], // ZIP-based format
      };

      const fileExt = path.extname(filePath).toLowerCase().slice(1);
      if (expectedHeaders[fileExt] && !expectedHeaders[fileExt].some(header => fileHeader.startsWith(header))) {
        threats.push('File header does not match expected file type');
      }

      return {
        isSafe: threats.length === 0,
        threats: threats.length > 0 ? threats : undefined,
      };
    } catch (error) {
      console.error('File scan error:', error);
      return { isSafe: false, threats: ['File scan failed'] };
    }
  }

  // Generate file metadata
  static async getFileMetadata(filePath: string): Promise<{
    size: number;
    mimeType: string;
    extension: string;
    hash: string;
    createdAt: Date;
  }> {
    const stats = fs.statSync(filePath);
    const fileBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    
    return {
      size: stats.size,
      mimeType: this.getMimeType(filePath),
      extension: path.extname(filePath).toLowerCase(),
      hash,
      createdAt: stats.birthtime,
    };
  }

  // Get MIME type based on file extension
  private static getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  // Clean up file
  static async cleanupFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('File cleanup error:', error);
    }
  }

  // Move file to permanent location
  static async moveFileToPermanent(
    tempPath: string,
    permanentPath: string,
    createDirectories: boolean = true
  ): Promise<void> {
    try {
      if (createDirectories) {
        const dir = path.dirname(permanentPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }

      fs.renameSync(tempPath, permanentPath);
    } catch (error) {
      console.error('File move error:', error);
      throw new FileUploadError('Failed to move file to permanent location');
    }
  }
}

// File upload middleware with processing
export const createFileUploadMiddleware = (uploadPath: string = 'uploads') => {
  const upload = createUploadMiddleware(uploadPath);

  return {
    // Single file upload
    single: (fieldName: string) => {
      return async (req: any, res: any, next: any) => {
        upload.single(fieldName)(req, res, async (err) => {
          if (err) {
            return next(err);
          }

          if (req.file) {
            try {
              // Scan file for threats
              const scanResult = await FileProcessor.scanFile(req.file.path);
              if (!scanResult.isSafe) {
                // Clean up unsafe file
                await FileProcessor.cleanupFile(req.file.path);
                return next(new FileUploadError(`File rejected: ${scanResult.threats?.join(', ')}`));
              }

              // Get file metadata
              req.file.metadata = await FileProcessor.getFileMetadata(req.file.path);
              
              // Validate file metadata
              const validation = fileValidation.validateFile(req.file);
              if (!validation.isValid) {
                await FileProcessor.cleanupFile(req.file.path);
                return next(new FileUploadError(validation.error!));
              }
            } catch (error) {
              await FileProcessor.cleanupFile(req.file.path);
              return next(error);
            }
          }

          next();
        });
      };
    },

    // Multiple files upload
    array: (fieldName: string, maxCount: number = 5) => {
      return async (req: any, res: any, next: any) => {
        upload.array(fieldName, maxCount)(req, res, async (err) => {
          if (err) {
            return next(err);
          }

          if (req.files && req.files.length > 0) {
            try {
              for (const file of req.files) {
                // Scan each file
                const scanResult = await FileProcessor.scanFile(file.path);
                if (!scanResult.isSafe) {
                  // Clean up all files if any is unsafe
                  for (const f of req.files) {
                    await FileProcessor.cleanupFile(f.path);
                  }
                  return next(new FileUploadError(`File rejected: ${scanResult.threats?.join(', ')}`));
                }

                // Get file metadata
                file.metadata = await FileProcessor.getFileMetadata(file.path);
              }
            } catch (error) {
              // Clean up all files on error
              for (const file of req.files) {
                await FileProcessor.cleanupFile(file.path);
              }
              return next(error);
            }
          }

          next();
        });
      };
    },
  };
};

// File cleanup utilities
export const cleanupOrphanedFiles = async (prisma: any): Promise<number> => {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      return 0;
    }

    // Get all files referenced in database
    const [incomingFiles, outgoingFiles] = await Promise.all([
      prisma.incomingLetter.findMany({
        select: { filePath: true },
        where: { filePath: { not: null } },
      }),
      prisma.outgoingLetter.findMany({
        select: { filePath: true },
        where: { filePath: { not: null } },
      }),
    ]);

    const referencedFiles = new Set([
      ...incomingFiles.map(f => f.filePath),
      ...outgoingFiles.map(f => f.filePath),
    ].filter(Boolean));

    // Find orphaned files
    const files = fs.readdirSync(uploadsDir);
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(uploadsDir, file);
      const relativePath = path.relative(process.cwd(), filePath);
      
      if (!referencedFiles.has(relativePath)) {
        try {
          fs.unlinkSync(filePath);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete orphaned file ${filePath}:`, error);
        }
      }
    }

    return deletedCount;
  } catch (error) {
    console.error('Error cleaning up orphaned files:', error);
    return 0;
  }
};