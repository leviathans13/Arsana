import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { upload } from './incomingLetter.controller';
import fs from 'fs';

const prisma = new PrismaClient();

const outgoingLetterSchema = z.object({
  letterNumber: z.string().min(1),
  subject: z.string().min(1),
  recipient: z.string().min(1),
  sentDate: z.string().datetime(),
  category: z.enum(['GENERAL', 'INVITATION', 'OFFICIAL', 'ANNOUNCEMENT']).default('GENERAL'),
  description: z.string().optional(),
  isInvitation: z.boolean().default(false),
  eventDate: z.string().datetime().optional(),
  eventLocation: z.string().optional()
});

export const createOutgoingLetter = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const data = outgoingLetterSchema.parse(req.body);
    
    const letterData = {
      ...data,
      sentDate: new Date(data.sentDate),
      eventDate: data.eventDate ? new Date(data.eventDate) : null,
      userId: req.user!.userId,
      fileName: req.file?.originalname || null,
      filePath: req.file?.path || null
    };

    const letter = await prisma.outgoingLetter.create({
      data: letterData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.status(201).json(letter);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input data', details: error.errors });
      return;
    }
    console.error('Create outgoing letter error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOutgoingLetters = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const category = req.query.category as string;
    
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { recipient: { contains: search, mode: 'insensitive' } },
        { letterNumber: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (category) {
      where.category = category;
    }

    const [letters, total] = await Promise.all([
      prisma.outgoingLetter.findMany({
        where,
        skip,
        take: limit,
        orderBy: { sentDate: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.outgoingLetter.count({ where })
    ]);

    res.json({
      letters,
      pagination: {
        current: page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get outgoing letters error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOutgoingLetterById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const letter = await prisma.outgoingLetter.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!letter) {
      res.status(404).json({ error: 'Letter not found' });
      return;
    }

    res.json(letter);
  } catch (error) {
    console.error('Get outgoing letter error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateOutgoingLetter = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = outgoingLetterSchema.partial().parse(req.body);

    const existingLetter = await prisma.outgoingLetter.findUnique({
      where: { id }
    });

    if (!existingLetter) {
      res.status(404).json({ error: 'Letter not found' });
      return;
    }

    // Check if user owns the letter or is admin
    if (existingLetter.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const updateData: any = {
      ...data,
      sentDate: data.sentDate ? new Date(data.sentDate) : undefined,
      eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
    };

    if (req.file) {
      // Delete old file if exists
      if (existingLetter.filePath && fs.existsSync(existingLetter.filePath)) {
        fs.unlinkSync(existingLetter.filePath);
      }
      updateData.fileName = req.file.originalname;
      updateData.filePath = req.file.path;
    }

    const letter = await prisma.outgoingLetter.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json(letter);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input data', details: error.errors });
      return;
    }
    console.error('Update outgoing letter error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteOutgoingLetter = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existingLetter = await prisma.outgoingLetter.findUnique({
      where: { id }
    });

    if (!existingLetter) {
      res.status(404).json({ error: 'Letter not found' });
      return;
    }

    // Check if user owns the letter or is admin
    if (existingLetter.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    // Delete associated file
    if (existingLetter.filePath && fs.existsSync(existingLetter.filePath)) {
      fs.unlinkSync(existingLetter.filePath);
    }

    await prisma.outgoingLetter.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete outgoing letter error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};