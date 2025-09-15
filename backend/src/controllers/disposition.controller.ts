import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();

// Validation schemas
const createDispositionSchema = z.object({
  incomingLetterId: z.string().cuid('Invalid incoming letter ID'),
  dispositionTo: z.enum(['UMPEG', 'PERENCANAAN', 'KAUR_KEUANGAN', 'KABID', 'BIDANG1', 'BIDANG2', 'BIDANG3', 'BIDANG4', 'BIDANG5']),
  notes: z.string().max(1000, 'Notes maksimal 1000 karakter').optional().nullable()
});

const updateDispositionSchema = createDispositionSchema.partial();

export const createDisposition = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const data = createDispositionSchema.parse(req.body);

    // Verify the incoming letter exists and user has access
    const incomingLetter = await prisma.incomingLetter.findUnique({
      where: { id: data.incomingLetterId }
    });

    if (!incomingLetter) {
      res.status(404).json({ error: 'Incoming letter not found' });
      return;
    }

    // Check if user owns the letter or is admin
    if (incomingLetter.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const disposition = await prisma.disposition.create({
      data: {
        incomingLetterId: data.incomingLetterId,
        dispositionTo: data.dispositionTo,
        notes: data.notes || null
      },
      include: {
        incomingLetter: {
          select: {
            id: true,
            letterNumber: true,
            subject: true
          }
        }
      }
    });

    res.status(201).json(disposition);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input data', details: error.errors });
      return;
    }
    console.error('Create disposition error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDispositionsByLetter = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { letterId } = req.params;

    // Verify the incoming letter exists and user has access
    const incomingLetter = await prisma.incomingLetter.findUnique({
      where: { id: letterId }
    });

    if (!incomingLetter) {
      res.status(404).json({ error: 'Incoming letter not found' });
      return;
    }

    // Check if user owns the letter or is admin
    if (incomingLetter.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const dispositions = await prisma.disposition.findMany({
      where: { incomingLetterId: letterId },
      include: {
        incomingLetter: {
          select: {
            id: true,
            letterNumber: true,
            subject: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(dispositions);
  } catch (error) {
    console.error('Get dispositions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllDispositions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, dispositionTo } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const whereClause: any = {};
    
    // If not admin, only show dispositions for user's letters
    if (req.user!.role !== 'ADMIN') {
      whereClause.incomingLetter = {
        userId: req.user!.userId
      };
    }

    // Filter by disposition type if provided
    if (dispositionTo && typeof dispositionTo === 'string') {
      whereClause.dispositionTo = dispositionTo;
    }

    const [dispositions, total] = await Promise.all([
      prisma.disposition.findMany({
        where: whereClause,
        include: {
          incomingLetter: {
            select: {
              id: true,
              letterNumber: true,
              subject: true,
              sender: true,
              receivedDate: true
            }
          }
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.disposition.count({ where: whereClause })
    ]);

    res.json({
      dispositions,
      pagination: {
        current: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get all dispositions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDisposition = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const disposition = await prisma.disposition.findUnique({
      where: { id },
      include: {
        incomingLetter: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!disposition) {
      res.status(404).json({ error: 'Disposition not found' });
      return;
    }

    // Check if user owns the letter or is admin
    if (disposition.incomingLetter.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    res.json(disposition);
  } catch (error) {
    console.error('Get disposition error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateDisposition = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = updateDispositionSchema.parse(req.body);

    const existingDisposition = await prisma.disposition.findUnique({
      where: { id },
      include: {
        incomingLetter: true
      }
    });

    if (!existingDisposition) {
      res.status(404).json({ error: 'Disposition not found' });
      return;
    }

    // Check if user owns the letter or is admin
    if (existingDisposition.incomingLetter.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const updatedDisposition = await prisma.disposition.update({
      where: { id },
      data: {
        ...(data.dispositionTo && { dispositionTo: data.dispositionTo }),
        ...(data.notes !== undefined && { notes: data.notes || null })
      },
      include: {
        incomingLetter: {
          select: {
            id: true,
            letterNumber: true,
            subject: true
          }
        }
      }
    });

    res.json(updatedDisposition);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input data', details: error.errors });
      return;
    }
    console.error('Update disposition error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteDisposition = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existingDisposition = await prisma.disposition.findUnique({
      where: { id },
      include: {
        incomingLetter: true
      }
    });

    if (!existingDisposition) {
      res.status(404).json({ error: 'Disposition not found' });
      return;
    }

    // Check if user owns the letter or is admin
    if (existingDisposition.incomingLetter.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    await prisma.disposition.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete disposition error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};