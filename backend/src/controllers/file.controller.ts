import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { securityLogger } from '../utils/logger';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';

const prisma = new PrismaClient();

// Helper to check user access to letter based on role
const hasAccessToLetter = async (userId: string, userRole: string, letterId: string, letterType: 'incoming' | 'outgoing'): Promise<boolean> => {
  // Admin and operator have access to all letters
  if (userRole === 'ADMIN' || userRole === 'OPERATOR') {
    return true;
  }

  // Regular users can only access their own letters
  if (letterType === 'incoming') {
    const letter = await prisma.incomingLetter.findFirst({
      where: {
        id: letterId,
        userId: userId
      }
    });
    return !!letter;
  } else {
    const letter = await prisma.outgoingLetter.findFirst({
      where: {
        id: letterId,
        userId: userId
      }
    });
    return !!letter;
  }
};

export const downloadFile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { type, id } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      securityLogger.unauthorizedAccess(req.ip || 'unknown', req.originalUrl, userId);
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    if (type !== 'incoming' && type !== 'outgoing') {
      res.status(400).json({ error: 'Invalid file type' });
      return;
    }

    // Check access permissions
    const hasAccess = await hasAccessToLetter(userId, userRole, id, type);
    if (!hasAccess) {
      securityLogger.unauthorizedAccess(req.ip || 'unknown', req.originalUrl, userId);
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Find the letter based on type
    let letter: any = null;
    if (type === 'incoming') {
      letter = await prisma.incomingLetter.findUnique({
        where: { id },
        select: { 
          filePath: true, 
          fileName: true, 
          letterNumber: true,
          user: { select: { name: true } }
        }
      });
    } else {
      letter = await prisma.outgoingLetter.findUnique({
        where: { id },
        select: { 
          filePath: true, 
          fileName: true, 
          letterNumber: true,
          user: { select: { name: true } }
        }
      });
    }

    if (!letter) {
      res.status(404).json({ error: 'Letter not found' });
      return;
    }

    if (!letter.filePath || !letter.fileName) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    // Construct the file path and validate it's within allowed directory
    const uploadsDir = path.resolve(__dirname, '../../uploads');
    const filePath = path.resolve(letter.filePath);
    
    // Security check: ensure file is within uploads directory
    if (!filePath.startsWith(uploadsDir)) {
      securityLogger.unauthorizedAccess(req.ip || 'unknown', `Invalid file path: ${filePath}`, userId);
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'File not found on server' });
      return;
    }

    // Get file stats for logging
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    
    // Determine content type
    const mimeType = mime.lookup(filePath) || 'application/octet-stream';
    const isViewable = mimeType.startsWith('image/') || mimeType === 'application/pdf';

    // Set proper headers
    const fileName = letter.fileName;
    const disposition = req.query.preview && isViewable ? 'inline' : 'attachment';
    
    res.setHeader('Content-Disposition', `${disposition}; filename="${fileName}"`);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', fileSize.toString());
    
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cache-Control', 'private, no-cache');

    // Log the download
    securityLogger.fileAccess(userId, fileName, 'download');
    
    // Create read stream and pipe to response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('File streaming error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error reading file' });
      }
    });

    fileStream.on('end', () => {
      // Log successful download completion
      console.log(`File downloaded successfully: ${fileName} by user ${userId}`);
    });

  } catch (error) {
    console.error('Download file error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

// Preview file endpoint (for images and PDFs)
export const previewFile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  // Set preview flag and call downloadFile
  req.query.preview = 'true';
  await downloadFile(req, res);
};

// Get file info without downloading
export const getFileInfo = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { type, id } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    if (type !== 'incoming' && type !== 'outgoing') {
      res.status(400).json({ error: 'Invalid file type' });
      return;
    }

    // Check access permissions
    const hasAccess = await hasAccessToLetter(userId, userRole, id, type);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Find the letter based on type
    let letter: any = null;
    if (type === 'incoming') {
      letter = await prisma.incomingLetter.findUnique({
        where: { id },
        select: { 
          filePath: true, 
          fileName: true, 
          letterNumber: true,
          createdAt: true
        }
      });
    } else {
      letter = await prisma.outgoingLetter.findUnique({
        where: { id },
        select: { 
          filePath: true, 
          fileName: true, 
          letterNumber: true,
          createdAt: true
        }
      });
    }

    if (!letter) {
      res.status(404).json({ error: 'Letter not found' });
      return;
    }

    if (!letter.filePath || !letter.fileName) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    // Get file stats if file exists
    let fileInfo = null;
    const filePath = path.resolve(letter.filePath);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const mimeType = mime.lookup(filePath) || 'application/octet-stream';
      
      fileInfo = {
        fileName: letter.fileName,
        fileSize: stats.size,
        mimeType: mimeType,
        isViewable: mimeType.startsWith('image/') || mimeType === 'application/pdf',
        lastModified: stats.mtime.toISOString(),
        letterNumber: letter.letterNumber,
        uploadedAt: letter.createdAt
      };
    }

    res.json({
      exists: !!fileInfo,
      fileInfo
    });

  } catch (error) {
    console.error('Get file info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};