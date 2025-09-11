import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';

// Common validation schemas
export const commonSchemas = {
  id: z.string().cuid(),
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(128).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  ),
  name: z.string().min(1).max(100).trim(),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format').optional(),
  date: z.string().datetime().or(z.date()),
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
  search: z.object({
    query: z.string().min(1).max(100).trim().optional(),
    category: z.string().optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
  }),
};

// Letter validation schemas
export const letterSchemas = {
  create: z.object({
    letterNumber: z.string().min(1).max(50).trim(),
    subject: z.string().min(1).max(200).trim(),
    sender: z.string().min(1).max(100).trim(),
    recipient: z.string().min(1).max(100).trim().optional(),
    receivedDate: z.string().datetime(),
    sentDate: z.string().datetime().optional(),
    category: z.enum(['GENERAL', 'INVITATION', 'OFFICIAL', 'ANNOUNCEMENT']).default('GENERAL'),
    description: z.string().max(1000).trim().optional(),
    isInvitation: z.boolean().default(false),
    eventDate: z.string().datetime().optional(),
    eventLocation: z.string().max(200).trim().optional(),
  }),
  update: z.object({
    letterNumber: z.string().min(1).max(50).trim().optional(),
    subject: z.string().min(1).max(200).trim().optional(),
    sender: z.string().min(1).max(100).trim().optional(),
    recipient: z.string().min(1).max(100).trim().optional(),
    receivedDate: z.string().datetime().optional(),
    sentDate: z.string().datetime().optional(),
    category: z.enum(['GENERAL', 'INVITATION', 'OFFICIAL', 'ANNOUNCEMENT']).optional(),
    description: z.string().max(1000).trim().optional(),
    isInvitation: z.boolean().optional(),
    eventDate: z.string().datetime().optional(),
    eventLocation: z.string().max(200).trim().optional(),
  }),
};

// User validation schemas
export const userSchemas = {
  register: z.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    name: commonSchemas.name,
    role: z.enum(['ADMIN', 'STAFF']).default('STAFF'),
  }),
  login: z.object({
    email: commonSchemas.email,
    password: z.string().min(1),
  }),
  update: z.object({
    name: commonSchemas.name.optional(),
    email: commonSchemas.email.optional(),
    role: z.enum(['ADMIN', 'STAFF']).optional(),
  }),
  changePassword: z.object({
    currentPassword: z.string().min(1),
    newPassword: commonSchemas.password,
  }),
};

// Notification validation schemas
export const notificationSchemas = {
  create: z.object({
    title: z.string().min(1).max(100).trim(),
    message: z.string().min(1).max(500).trim(),
    type: z.enum(['INFO', 'WARNING', 'SUCCESS', 'ERROR']).default('INFO'),
    userId: z.string().cuid().optional(),
  }),
  update: z.object({
    isRead: z.boolean().optional(),
  }),
};

// Sanitization function
export const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    return DOMPurify.sanitize(input.trim());
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return input;
};

// Validation middleware factory
export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Sanitize input first
      req.body = sanitizeInput(req.body);
      req.query = sanitizeInput(req.query);
      req.params = sanitizeInput(req.params);

      // Validate the sanitized input
      const validatedData = schema.parse({
        ...req.body,
        ...req.query,
        ...req.params,
      });

      // Replace the original data with validated data
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        });
        return;
      }
      next(error);
    }
  };
};

// File validation utilities
export const fileValidation = {
  allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/jpg'],
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedExtensions: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
  
  validateFile: (file: Express.Multer.File): { isValid: boolean; error?: string } => {
    if (!file) {
      return { isValid: false, error: 'No file provided' };
    }

    if (file.size > fileValidation.maxSize) {
      return { isValid: false, error: 'File size exceeds 10MB limit' };
    }

    if (!fileValidation.allowedTypes.includes(file.mimetype)) {
      return { isValid: false, error: 'Invalid file type. Only PDF, DOC, DOCX, JPG, JPEG, PNG files are allowed' };
    }

    const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    if (!fileValidation.allowedExtensions.includes(ext)) {
      return { isValid: false, error: 'Invalid file extension' };
    }

    return { isValid: true };
  },
};

// Query parameter validation
export const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Invalid query parameters',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
};