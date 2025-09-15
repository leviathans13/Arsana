import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { formatDate } from '../utils/helpers';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// Multer configuration for outgoing letter file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/letters/outgoing');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `outgoing-${uniqueSuffix}-${sanitizedOriginalName}`);
  }
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPG, JPEG, PNG files are allowed.'));
    }
  }
});

// Helper untuk koersi boolean dari multipart/form-data
const toBoolean = (val: unknown) => {
  if (typeof val === 'string') {
    const v = val.trim().toLowerCase();
    if (['true', '1', 'on', 'yes'].includes(v)) return true;
    if (['false', '0', 'off', 'no', ''].includes(v)) return false;
  }
  return val;
};

const outgoingLetterSchema = z.object({
  letterNumber: z.string()
    .min(3, 'Nomor surat minimal 3 karakter')
    .max(50, 'Nomor surat maksimal 50 karakter')
    .regex(/^[A-Za-z0-9\-\/]+$/, 'Nomor surat hanya boleh berisi huruf, angka, tanda hubung, dan garis miring'),
  subject: z.string()
    .min(5, 'Subjek minimal 5 karakter')
    .max(200, 'Subjek maksimal 200 karakter'),
  recipient: z.string()
    .min(2, 'Nama penerima minimal 2 karakter')
    .max(100, 'Nama penerima maksimal 100 karakter'),
  sentDate: z.string()
    .datetime('Format tanggal tidak valid')
    .refine((date) => {
      const sentDate = new Date(date);
      const now = new Date();
      return sentDate <= now;
    }, 'Tanggal kirim tidak boleh di masa depan'),
  category: z.enum(['GENERAL', 'INVITATION', 'OFFICIAL', 'ANNOUNCEMENT'], {
    errorMap: () => ({ message: 'Kategori tidak valid' })
  }).default('GENERAL'),
  description: z.string()
    .max(1000, 'Deskripsi maksimal 1000 karakter')
    .optional()
    .nullable(),
  // Perbaikan: koersi boolean
  isInvitation: z.preprocess(toBoolean, z.boolean()).default(false),
  eventDate: z.string()
    .datetime('Format tanggal acara tidak valid')
    .optional()
    .nullable(),
  eventLocation: z.string()
    .max(200, 'Lokasi acara maksimal 200 karakter')
    .optional()
    .nullable()
}).refine((data) => {
  // If it's an invitation, eventDate is required
  if (data.isInvitation && !data.eventDate) {
    return false;
  }
  // If eventDate is provided and sentDate exists, eventDate must be after sentDate
  if (data.eventDate && data.sentDate) {
    const eventDate = new Date(data.eventDate);
    const sentDate = new Date(data.sentDate);
    return eventDate > sentDate;
  }
  return true;
}, {
  message: 'Untuk undangan, tanggal acara wajib diisi dan harus setelah tanggal kirim',
  path: ['eventDate']
});

const updateOutgoingLetterSchema = z.object({
  letterNumber: z.string()
    .min(3, 'Nomor surat minimal 3 karakter')
    .max(50, 'Nomor surat maksimal 50 karakter')
    .regex(/^[A-Za-z0-9\-\/]+$/, 'Nomor surat hanya boleh berisi huruf, angka, tanda hubung, dan garis miring')
    .optional(),
  subject: z.string()
    .min(5, 'Subjek minimal 5 karakter')
    .max(200, 'Subjek maksimal 200 karakter')
    .optional(),
  recipient: z.string()
    .min(2, 'Nama penerima minimal 2 karakter')
    .max(100, 'Nama penerima maksimal 100 karakter')
    .optional(),
  sentDate: z.string()
    .datetime('Format tanggal tidak valid')
    .optional(),
  category: z.enum(['GENERAL', 'INVITATION', 'OFFICIAL', 'ANNOUNCEMENT'])
    .optional(),
  description: z.string()
    .max(1000, 'Deskripsi maksimal 1000 karakter')
    .optional()
    .nullable(),
  // Perbaikan: koersi boolean
  isInvitation: z.preprocess(toBoolean, z.boolean()).optional(),
  eventDate: z.string()
    .datetime('Format tanggal acara tidak valid')
    .optional()
    .nullable(),
  eventLocation: z.string()
    .max(200, 'Lokasi acara maksimal 200 karakter')
    .optional()
    .nullable()
});

export const createOutgoingLetter = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Parse and validate input data
    const data = outgoingLetterSchema.parse(req.body);
    
    // Check for duplicate letter number
    const existingLetter = await prisma.outgoingLetter.findFirst({
      where: {
        letterNumber: data.letterNumber
      }
    });
    
    if (existingLetter) {
      res.status(400).json({ 
        error: 'Nomor surat sudah digunakan', 
        details: [{ 
          field: 'letterNumber', 
          message: 'Nomor surat sudah ada dalam sistem' 
        }] 
      });
      return;
    }

    // Prepare letter data
    const letterData = {
      ...data,
      sentDate: new Date(data.sentDate),
      eventDate: data.eventDate ? new Date(data.eventDate) : null,
      description: data.description || null,
      eventLocation: data.eventLocation || null,
      userId: req.user!.userId,
      fileName: req.file?.originalname || null,
      filePath: req.file?.path || null
    };

    // Create letter
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

    // Create global notification for the created letter (visible to all users)
    if (data.isInvitation && data.eventDate) {
      const eventDate = new Date(data.eventDate);
      const daysBefore = Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (daysBefore > 0 && daysBefore <= 30) {
        await prisma.notification.create({
          data: {
            title: 'Acara Baru Ditambahkan',
            message: `Acara "${data.subject}" telah dijadwalkan pada tanggal ${formatDate(eventDate)} oleh ${letter.user.name}`,
            type: 'INFO',
            userId: null // Global notification for all users
          }
        });
      }
    }

    res.status(201).json({
      message: 'Surat keluar berhasil dibuat',
      data: letter
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      
      res.status(400).json({ 
        error: 'Data yang dimasukkan tidak valid', 
        details: formattedErrors 
      });
      return;
    }
    
    // Handle Prisma unique constraint errors
    if ((error as any).code === 'P2002') {
      res.status(400).json({ 
        error: 'Data sudah ada dalam sistem', 
        details: [{ 
          field: (error as any).meta?.target?.[0] || 'unknown', 
          message: 'Data dengan nilai tersebut sudah ada' 
        }] 
      });
      return;
    }
    
    console.error('Create outgoing letter error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server', 
      message: 'Silakan coba lagi nanti' 
    });
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
    const data = updateOutgoingLetterSchema.parse(req.body);

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