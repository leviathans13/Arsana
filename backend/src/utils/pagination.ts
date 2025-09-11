import { Request } from 'express';
import { z } from 'zod';

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
  offset: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    current: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextPage?: number;
    prevPage?: number;
  };
}

export interface FilterOptions {
  search?: string;
  category?: string;
  dateFrom?: Date;
  dateTo?: Date;
  userId?: string;
  isRead?: boolean;
  [key: string]: any;
}

// Pagination schema validation
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Filter schema validation
export const filterSchema = z.object({
  search: z.string().min(1).max(100).trim().optional(),
  category: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  userId: z.string().cuid().optional(),
  isRead: z.coerce.boolean().optional(),
});

// Extract pagination options from request
export const extractPaginationOptions = (req: Request): PaginationOptions => {
  const { page = 1, limit = 10, sortBy, sortOrder = 'desc' } = req.query;
  
  const parsedPage = Math.max(1, parseInt(page as string) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit as string) || 10));
  const offset = (parsedPage - 1) * parsedLimit;

  return {
    page: parsedPage,
    limit: parsedLimit,
    sortBy: sortBy as string,
    sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
    offset,
  };
};

// Extract filter options from request
export const extractFilterOptions = (req: Request): FilterOptions => {
  const { search, category, dateFrom, dateTo, userId, isRead, ...otherFilters } = req.query;
  
  const filters: FilterOptions = {};

  if (search) {
    filters.search = search as string;
  }

  if (category) {
    filters.category = category as string;
  }

  if (dateFrom) {
    filters.dateFrom = new Date(dateFrom as string);
  }

  if (dateTo) {
    filters.dateTo = new Date(dateTo as string);
  }

  if (userId) {
    filters.userId = userId as string;
  }

  if (isRead !== undefined) {
    filters.isRead = isRead === 'true';
  }

  // Add other filters
  Object.assign(filters, otherFilters);

  return filters;
};

// Build Prisma where clause from filters
export const buildWhereClause = (filters: FilterOptions, searchFields: string[] = []): any => {
  const where: any = {};

  // Search functionality
  if (filters.search && searchFields.length > 0) {
    where.OR = searchFields.map(field => ({
      [field]: {
        contains: filters.search,
        mode: 'insensitive' as const,
      },
    }));
  }

  // Category filter
  if (filters.category) {
    where.category = filters.category;
  }

  // Date range filters
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) {
      where.createdAt.gte = filters.dateFrom;
    }
    if (filters.dateTo) {
      where.createdAt.lte = filters.dateTo;
    }
  }

  // User filter
  if (filters.userId) {
    where.userId = filters.userId;
  }

  // Boolean filters
  if (filters.isRead !== undefined) {
    where.isRead = filters.isRead;
  }

  // Add other filters dynamically
  Object.entries(filters).forEach(([key, value]) => {
    if (!['search', 'category', 'dateFrom', 'dateTo', 'userId', 'isRead'].includes(key) && value !== undefined) {
      where[key] = value;
    }
  });

  return where;
};

// Build Prisma orderBy clause from pagination options
export const buildOrderByClause = (pagination: PaginationOptions, defaultSortBy: string = 'createdAt'): any => {
  const sortBy = pagination.sortBy || defaultSortBy;
  return { [sortBy]: pagination.sortOrder };
};

// Create paginated response
export const createPaginatedResponse = <T>(
  data: T[],
  total: number,
  pagination: PaginationOptions
): PaginationResult<T> => {
  const pages = Math.ceil(total / pagination.limit);
  const hasNext = pagination.page < pages;
  const hasPrev = pagination.page > 1;

  return {
    data,
    pagination: {
      current: pagination.page,
      limit: pagination.limit,
      total,
      pages,
      hasNext,
      hasPrev,
      nextPage: hasNext ? pagination.page + 1 : undefined,
      prevPage: hasPrev ? pagination.page - 1 : undefined,
    },
  };
};

// Generic pagination function for Prisma queries
export const paginate = async <T>(
  prisma: any,
  model: string,
  pagination: PaginationOptions,
  filters: FilterOptions = {},
  searchFields: string[] = [],
  include?: any,
  select?: any
): Promise<PaginationResult<T>> => {
  const where = buildWhereClause(filters, searchFields);
  const orderBy = buildOrderByClause(pagination);

  const [data, total] = await Promise.all([
    prisma[model].findMany({
      where,
      skip: pagination.offset,
      take: pagination.limit,
      orderBy,
      include,
      select,
    }),
    prisma[model].count({ where }),
  ]);

  return createPaginatedResponse(data, total, pagination);
};

// Cursor-based pagination for large datasets
export interface CursorPaginationOptions {
  cursor?: string;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface CursorPaginationResult<T> {
  data: T[];
  nextCursor?: string;
  hasNext: boolean;
}

export const cursorPaginate = async <T>(
  prisma: any,
  model: string,
  options: CursorPaginationOptions,
  filters: FilterOptions = {},
  include?: any,
  select?: any
): Promise<CursorPaginationResult<T>> => {
  const { cursor, limit, sortBy, sortOrder } = options;
  const where = buildWhereClause(filters);

  // Add cursor condition
  if (cursor) {
    const cursorCondition = {
      [sortBy]: sortOrder === 'asc' 
        ? { gt: cursor }
        : { lt: cursor }
    };
    where.AND = where.AND ? [...where.AND, cursorCondition] : [cursorCondition];
  }

  const data = await prisma[model].findMany({
    where,
    take: limit + 1, // Take one extra to check if there's a next page
    orderBy: { [sortBy]: sortOrder },
    include,
    select,
  });

  const hasNext = data.length > limit;
  const result = hasNext ? data.slice(0, -1) : data;
  const nextCursor = hasNext ? (result[result.length - 1] as any)[sortBy] : undefined;

  return {
    data: result,
    nextCursor,
    hasNext,
  };
};

// Search utilities
export const createSearchQuery = (searchTerm: string, fields: string[]): any => {
  if (!searchTerm || fields.length === 0) {
    return {};
  }

  return {
    OR: fields.map(field => ({
      [field]: {
        contains: searchTerm,
        mode: 'insensitive' as const,
      },
    })),
  };
};

// Advanced search with fuzzy matching
export const createFuzzySearchQuery = (searchTerm: string, fields: string[]): any => {
  if (!searchTerm || fields.length === 0) {
    return {};
  }

  // Split search term into words
  const words = searchTerm.trim().split(/\s+/);
  
  return {
    AND: words.map(word => ({
      OR: fields.map(field => ({
        [field]: {
          contains: word,
          mode: 'insensitive' as const,
        },
      })),
    })),
  };
};

// Date range utilities
export const createDateRangeQuery = (dateFrom?: Date, dateTo?: Date, field: string = 'createdAt'): any => {
  const query: any = {};
  
  if (dateFrom || dateTo) {
    query[field] = {};
    if (dateFrom) {
      query[field].gte = dateFrom;
    }
    if (dateTo) {
      query[field].lte = dateTo;
    }
  }
  
  return query;
};

// Aggregation utilities
export const createAggregationQuery = async (
  prisma: any,
  model: string,
  filters: FilterOptions = {},
  groupBy: string[] = [],
  aggregations: Record<string, any> = {}
): Promise<any> => {
  const where = buildWhereClause(filters);
  
  // This is a simplified version - in practice, you might need to use raw SQL for complex aggregations
  const data = await prisma[model].findMany({
    where,
    select: {
      ...groupBy.reduce((acc, field) => ({ ...acc, [field]: true }), {}),
      ...aggregations,
    },
  });

  return data;
};

// Export commonly used pagination configurations
export const paginationConfigs = {
  default: { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' as const },
  large: { page: 1, limit: 50, sortBy: 'createdAt', sortOrder: 'desc' as const },
  small: { page: 1, limit: 5, sortBy: 'createdAt', sortOrder: 'desc' as const },
  recent: { page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' as const },
};