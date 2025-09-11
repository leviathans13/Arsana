import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

export const downloadFile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { type, id } = req.params;
    
    if (type !== 'incoming' && type !== 'outgoing') {
      res.status(400).json({ error: 'Invalid file type' });
      return;
    }

    // Find the letter based on type
    let letter: any = null;
    if (type === 'incoming') {
      letter = await prisma.incomingLetter.findUnique({
        where: { id },
        select: { filePath: true, fileName: true }
      });
    } else {
      letter = await prisma.outgoingLetter.findUnique({
        where: { id },
        select: { filePath: true, fileName: true }
      });
    }

    if (!letter) {
      res.status(404).json({ error: 'Letter not found' });
      return;
    }

    if (!letter.filePath) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    // Construct the file path
    const filePath = path.resolve(letter.filePath);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'File not found on server' });
      return;
    }

    // Set proper headers
    const fileName = letter.fileName || 'document';
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Create read stream and pipe to response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('File streaming error:', error);
      res.status(500).json({ error: 'Error reading file' });
    });

  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};