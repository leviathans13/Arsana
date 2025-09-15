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
  createdDate: z.string()
    .datetime('Format tanggal pembuatan tidak valid')
    .refine((date) => {
      const createdDate = new Date(date);
      const now = new Date();
      return createdDate <= now;
    }, 'Tanggal pembuatan tidak boleh di masa depan'),
  letterDate: z.string()
    .datetime('Format tanggal surat tidak valid')
    .refine((date) => {
      const letterDate = new Date(date);
      const now = new Date();
      return letterDate <= now;
    }, 'Tanggal surat tidak boleh di masa depan'),
  securityClass: z.enum(['BIASA'], {
    errorMap: () => ({ message: 'Klasifikasi keamanan tidak valid' })
  }).default('BIASA'),
  classificationCode: z.string()
    .max(50, 'Kode klasifikasi maksimal 50 karakter')
    .optional()
    .nullable(),
  serialNumber: z.number()
    .int('Nomor urut harus berupa bilangan bulat')
    .min(1, 'Nomor urut minimal 1')
    .optional()
    .nullable(),
  letterNumber: z.string()
    .min(3, 'Nomor surat minimal 3 karakter')
    .max(100, 'Nomor surat maksimal 100 karakter')
    .regex(/^[A-Za-z0-9\-\/]+$/, 'Nomor surat hanya boleh berisi huruf, angka, tanda hubung, dan garis miring'),
  letterNature: z.enum(['BIASA', 'TERBATAS', 'RAHASIA', 'SANGAT_RAHASIA', 'PENTING'], {
    errorMap: () => ({ message: 'Sifat surat tidak valid' })
  }).default('BIASA'),
  subject: z.string()
    .min(5, 'Subjek minimal 5 karakter')
    .max(200, 'Subjek maksimal 200 karakter'),
  executionDate: z.string()
    .datetime('Format tanggal pelaksanaan tidak valid')
    .optional()
    .nullable(),
  sender: z.string()
    .min(2, 'Nama pengirim minimal 2 karakter')
    .max(100, 'Nama pengirim maksimal 100 karakter'),
  recipient: z.string()
    .min(2, 'Nama penerima minimal 2 karakter')
    .max(100, 'Nama penerima maksimal 100 karakter'),
  processor: z.string()
    .min(2, 'Nama pengolah minimal 2 karakter')
    .max(100, 'Nama pengolah maksimal 100 karakter'),
  note: z.string()
    .max(1000, 'Keterangan maksimal 1000 karakter')
    .optional()
    .nullable(),
  // Invitation specific fields
  isInvitation: z.preprocess(toBoolean, z.boolean()).default(false),
  eventDate: z.string()
    .datetime('Format tanggal acara tidak valid')
    .optional()
    .nullable(),
  eventTime: z.string()
    .max(20, 'Waktu acara maksimal 20 karakter')
    .optional()
    .nullable(),
  eventLocation: z.string()
    .max(200, 'Lokasi acara maksimal 200 karakter')
    .optional()
    .nullable(),
  eventNotes: z.string()
    .max(1000, 'Catatan acara maksimal 1000 karakter')
    .optional()
    .nullable()
}).refine((data) => {
  // If it's an invitation, eventDate is required
  if (data.isInvitation && !data.eventDate) {
    return false;
  }
  // If eventDate is provided and letterDate exists, eventDate must be after letterDate
  if (data.eventDate && data.letterDate) {
    const eventDate = new Date(data.eventDate);
    const letterDate = new Date(data.letterDate);
    return eventDate >= letterDate;
  }
  return true;
}, {
  message: 'Untuk undangan, tanggal acara wajib diisi dan tidak boleh sebelum tanggal surat',
  path: ['eventDate']
});

const updateOutgoingLetterSchema = z.object({
  createdDate: z.string()
    .datetime('Format tanggal pembuatan tidak valid')
    .optional(),
  letterDate: z.string()
    .datetime('Format tanggal surat tidak valid')
    .optional(),
  securityClass: z.enum(['BIASA'])
    .optional(),
  classificationCode: z.string()
    .max(50, 'Kode klasifikasi maksimal 50 karakter')
    .optional()
    .nullable(),
  serialNumber: z.number()
    .int('Nomor urut harus berupa bilangan bulat')
    .min(1, 'Nomor urut minimal 1')
    .optional()
    .nullable(),
  letterNumber: z.string()
    .min(3, 'Nomor surat minimal 3 karakter')
    .max(100, 'Nomor surat maksimal 100 karakter')
    .regex(/^[A-Za-z0-9\-\/]+$/, 'Nomor surat hanya boleh berisi huruf, angka, tanda hubung, dan garis miring')
    .optional(),
  letterNature: z.enum(['BIASA', 'TERBATAS', 'RAHASIA', 'SANGAT_RAHASIA', 'PENTING'])
    .optional(),
  subject: z.string()
    .min(5, 'Subjek minimal 5 karakter')
    .max(200, 'Subjek maksimal 200 karakter')
    .optional(),
  executionDate: z.string()
    .datetime('Format tanggal pelaksanaan tidak valid')
    .optional()
    .nullable(),
  sender: z.string()
    .min(2, 'Nama pengirim minimal 2 karakter')
    .max(100, 'Nama pengirim maksimal 100 karakter')
    .optional(),
  recipient: z.string()
    .min(2, 'Nama penerima minimal 2 karakter')
    .max(100, 'Nama penerima maksimal 100 karakter')
    .optional(),
  processor: z.string()
    .min(2, 'Nama pengolah minimal 2 karakter')
    .max(100, 'Nama pengolah maksimal 100 karakter')
    .optional(),
  note: z.string()
    .max(1000, 'Keterangan maksimal 1000 karakter')
    .optional()
    .nullable(),
  // Invitation specific fields
  isInvitation: z.preprocess(toBoolean, z.boolean()).optional(),
  eventDate: z.string()
    .datetime('Format tanggal acara tidak valid')
    .optional()
    .nullable(),
  eventTime: z.string()
    .max(20, 'Waktu acara maksimal 20 karakter')
    .optional()
    .nullable(),
  eventLocation: z.string()
    .max(200, 'Lokasi acara maksimal 200 karakter')
    .optional()
    .nullable(),
  eventNotes: z.string()
    .max(1000, 'Catatan acara maksimal 1000 karakter')
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
      createdDate: new Date(data.createdDate),
      letterDate: new Date(data.letterDate),
      securityClass: data.securityClass || 'BIASA',
      classificationCode: data.classificationCode || null,
      serialNumber: data.serialNumber || null,
      letterNumber: data.letterNumber,
      letterNature: data.letterNature || 'BIASA',
      subject: data.subject,
      executionDate: data.executionDate ? new Date(data.executionDate) : null,
      sender: data.sender,
      recipient: data.recipient,
      processor: data.processor,
      note: data.note || null,
      isInvitation: data.isInvitation || false,
      eventDate: data.eventDate ? new Date(data.eventDate) : null,
      eventTime: data.eventTime || null,
      eventLocation: data.eventLocation || null,
      eventNotes: data.eventNotes || null,
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
    const letterNature = req.query.letterNature as string;
    const securityClass = req.query.securityClass as string;
    
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { recipient: { contains: search, mode: 'insensitive' } },
        { sender: { contains: search, mode: 'insensitive' } },
        { letterNumber: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (letterNature) {
      where.letterNature = letterNature;
    }
    
    if (securityClass) {
      where.securityClass = securityClass;
    }

    const [letters, total] = await Promise.all([
      prisma.outgoingLetter.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdDate: 'desc' },
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
      ...(data.createdDate && { createdDate: new Date(data.createdDate) }),
      ...(data.letterDate && { letterDate: new Date(data.letterDate) }),
      ...(data.securityClass && { securityClass: data.securityClass }),
      ...(data.classificationCode !== undefined && { classificationCode: data.classificationCode || null }),
      ...(data.serialNumber !== undefined && { serialNumber: data.serialNumber || null }),
      ...(data.letterNumber && { letterNumber: data.letterNumber }),
      ...(data.letterNature && { letterNature: data.letterNature }),
      ...(data.subject && { subject: data.subject }),
      ...(data.executionDate !== undefined && { executionDate: data.executionDate ? new Date(data.executionDate) : null }),
      ...(data.sender && { sender: data.sender }),
      ...(data.recipient && { recipient: data.recipient }),
      ...(data.processor && { processor: data.processor }),
      ...(data.note !== undefined && { note: data.note || null }),
      ...(data.isInvitation !== undefined && { isInvitation: data.isInvitation }),
      ...(data.eventDate !== undefined && { eventDate: data.eventDate ? new Date(data.eventDate) : null }),
      ...(data.eventTime !== undefined && { eventTime: data.eventTime || null }),
      ...(data.eventLocation !== undefined && { eventLocation: data.eventLocation || null }),
      ...(data.eventNotes !== undefined && { eventNotes: data.eventNotes || null })
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