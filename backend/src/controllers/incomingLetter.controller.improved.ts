import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { 
  validate, 
  fileValidation, 
  letterSchemas 
} from '../utils/validation';
import { 
  AppError, 
  NotFoundError, 
  AuthorizationError, 
  FileUploadError,
  asyncHandler 
} from '../utils/errors';
import { 
  paginate, 
  extractPaginationOptions, 
  extractFilterOptions,
  buildWhereClause,
  buildOrderByClause,
  createPaginatedResponse
} from '../utils/pagination';
import { cache, CacheManager, invalidateLetterCache } from '../utils/cache';
import { 
  createTransactionPatterns, 
  createTransactionManager 
} from '../utils/transactions';
import { 
  createFileUploadMiddleware, 
  FileProcessor 
} from '../utils/fileUpload';
import prisma from '../config/database';

const transactionPatterns = createTransactionPatterns(prisma);
const transactionManager = createTransactionManager(prisma);

// File upload middleware
const uploadMiddleware = createFileUploadMiddleware('uploads');

// Create incoming letter with file upload
export const createIncomingLetter = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const data = letterSchemas.create.parse(req.body);
  
  // Validate file if present
  if (req.file) {
    const fileValidation = fileValidation.validateFile(req.file);
    if (!fileValidation.isValid) {
      await FileProcessor.cleanupFile(req.file.path);
      throw new FileUploadError(fileValidation.error!);
    }
  }

  const fileData = req.file ? {
    fileName: req.file.originalname,
    filePath: req.file.path,
  } : null;

  const letter = await transactionPatterns.createLetterWithFile(
    {
      ...data,
      receivedDate: new Date(data.receivedDate),
      eventDate: data.eventDate ? new Date(data.eventDate) : null,
    },
    fileData,
    req.user!.userId,
    'incoming'
  );

  // Invalidate relevant caches
  invalidateLetterCache(letter.id, 'incoming');
  cache.del(CacheManager.lettersListKey('incoming', {}));

  res.status(201).json(letter);
});

// Get incoming letters with advanced filtering and pagination
export const getIncomingLetters = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const pagination = extractPaginationOptions(req);
  const filters = extractFilterOptions(req);
  
  // Add user filter for non-admin users
  if (req.user!.role !== 'ADMIN') {
    filters.userId = req.user!.userId;
  }

  const searchFields = ['subject', 'sender', 'letterNumber', 'description'];
  const cacheKey = CacheManager.lettersListKey('incoming', { ...filters, ...pagination });

  // Try to get from cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  const result = await paginate(
    prisma,
    'incomingLetter',
    pagination,
    filters,
    searchFields,
    {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    }
  );

  // Cache the result
  cache.set(cacheKey, result, 300); // 5 minutes

  res.json(result);
});

// Get incoming letter by ID
export const getIncomingLetterById = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const cacheKey = CacheManager.letterKey(id, 'incoming');

  // Try to get from cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    // Check permissions for cached data
    if (cached.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
      throw new AuthorizationError('Unauthorized to access this letter');
    }
    res.json(cached);
    return;
  }

  const letter = await prisma.incomingLetter.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!letter) {
    throw new NotFoundError('Incoming letter');
  }

  // Check permissions
  if (letter.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
    throw new AuthorizationError('Unauthorized to access this letter');
  }

  // Cache the result
  cache.set(cacheKey, letter, 600); // 10 minutes

  res.json(letter);
});

// Update incoming letter
export const updateIncomingLetter = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const data = letterSchemas.update.parse(req.body);

  // Validate file if present
  if (req.file) {
    const fileValidation = fileValidation.validateFile(req.file);
    if (!fileValidation.isValid) {
      await FileProcessor.cleanupFile(req.file.path);
      throw new FileUploadError(fileValidation.error!);
    }
  }

  const fileData = req.file ? {
    fileName: req.file.originalname,
    filePath: req.file.path,
  } : null;

  const updateData = {
    ...data,
    receivedDate: data.receivedDate ? new Date(data.receivedDate) : undefined,
    eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
  };

  const result = await transactionPatterns.updateLetterWithFile(
    id,
    updateData,
    fileData,
    req.user!.userId,
    'incoming'
  );

  // Clean up old file if it was replaced
  if (result.oldFilePath) {
    await FileProcessor.cleanupFile(result.oldFilePath);
  }

  // Invalidate relevant caches
  invalidateLetterCache(id, 'incoming');
  cache.del(CacheManager.lettersListKey('incoming', {}));

  res.json(result.letter);
});

// Delete incoming letter
export const deleteIncomingLetter = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const result = await transactionPatterns.deleteLetterWithFile(
    id,
    req.user!.userId,
    'incoming'
  );

  // Clean up associated file
  if (result.filePath) {
    await FileProcessor.cleanupFile(result.filePath);
  }

  // Invalidate relevant caches
  invalidateLetterCache(id, 'incoming');
  cache.del(CacheManager.lettersListKey('incoming', {}));

  res.status(204).send();
});

// Bulk create incoming letters
export const bulkCreateIncomingLetters = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { letters } = req.body;

  if (!Array.isArray(letters) || letters.length === 0) {
    throw new AppError('Letters array is required and cannot be empty', 400);
  }

  if (letters.length > 100) {
    throw new AppError('Cannot create more than 100 letters at once', 400);
  }

  // Validate all letters
  const validatedLetters = letters.map(letter => letterSchemas.create.parse(letter));

  const result = await transactionPatterns.bulkCreateLetters(
    validatedLetters.map(letter => ({
      ...letter,
      receivedDate: new Date(letter.receivedDate),
      eventDate: letter.eventDate ? new Date(letter.eventDate) : null,
    })),
    req.user!.userId,
    'incoming'
  );

  // Invalidate caches
  cache.del(CacheManager.lettersListKey('incoming', {}));

  res.status(201).json({
    message: `${result.length} incoming letters created successfully`,
    letters: result,
  });
});

// Get incoming letter statistics
export const getIncomingLetterStats = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const cacheKey = CacheManager.generateKey('stats', 'incoming', req.user!.userId);
  
  // Try to get from cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  const whereClause = req.user!.role === 'ADMIN' ? {} : { userId: req.user!.userId };

  const [
    total,
    thisMonth,
    thisWeek,
    byCategory,
    recentActivity,
  ] = await Promise.all([
    prisma.incomingLetter.count({ where: whereClause }),
    prisma.incomingLetter.count({
      where: {
        ...whereClause,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
    prisma.incomingLetter.count({
      where: {
        ...whereClause,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.incomingLetter.groupBy({
      by: ['category'],
      where: whereClause,
      _count: { category: true },
    }),
    prisma.incomingLetter.findMany({
      where: whereClause,
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        subject: true,
        category: true,
        createdAt: true,
      },
    }),
  ]);

  const stats = {
    total,
    thisMonth,
    thisWeek,
    byCategory: byCategory.reduce((acc, item) => {
      acc[item.category] = item._count.category;
      return acc;
    }, {} as Record<string, number>),
    recentActivity,
  };

  // Cache the result
  cache.set(cacheKey, stats, 300); // 5 minutes

  res.json(stats);
});

// Search incoming letters
export const searchIncomingLetters = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { q: query, category, dateFrom, dateTo } = req.query;
  const pagination = extractPaginationOptions(req);

  if (!query || typeof query !== 'string') {
    throw new AppError('Search query is required', 400);
  }

  const filters: any = {
    search: query,
    category: category as string,
    dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
    dateTo: dateTo ? new Date(dateTo as string) : undefined,
  };

  // Add user filter for non-admin users
  if (req.user!.role !== 'ADMIN') {
    filters.userId = req.user!.userId;
  }

  const searchFields = ['subject', 'sender', 'letterNumber', 'description'];
  const result = await paginate(
    prisma,
    'incomingLetter',
    pagination,
    filters,
    searchFields,
    {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    }
  );

  res.json(result);
});

// Export file upload middleware for use in routes
export { uploadMiddleware };