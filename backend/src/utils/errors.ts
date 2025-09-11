export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, true, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    if (details) {
      (this as any).details = details;
    }
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, true, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, true, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, true, 'NOT_FOUND_ERROR');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, true, 'CONFLICT_ERROR');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, true, 'RATE_LIMIT_ERROR');
    this.name = 'RateLimitError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(message, 500, true, 'DATABASE_ERROR');
    this.name = 'DatabaseError';
  }
}

export class FileUploadError extends AppError {
  constructor(message: string = 'File upload failed') {
    super(message, 400, true, 'FILE_UPLOAD_ERROR');
    this.name = 'FileUploadError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string = 'External service error') {
    super(`${service}: ${message}`, 502, true, 'EXTERNAL_SERVICE_ERROR');
    this.name = 'ExternalServiceError';
  }
}

// Error handler utility
export const handleError = (error: Error): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  // Handle Prisma errors
  if ((error as any).code) {
    const prismaError = error as any;
    switch (prismaError.code) {
      case 'P2002':
        return new ConflictError('Resource already exists');
      case 'P2025':
        return new NotFoundError();
      case 'P2003':
        return new ValidationError('Invalid reference to related resource');
      case 'P2014':
        return new ValidationError('Invalid ID provided');
      default:
        return new DatabaseError(prismaError.message);
    }
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return new AuthenticationError('Invalid token');
  }
  if (error.name === 'TokenExpiredError') {
    return new AuthenticationError('Token expired');
  }

  // Handle validation errors
  if (error.name === 'ZodError') {
    return new ValidationError('Invalid input data', (error as any).errors);
  }

  // Handle multer errors
  if (error.name === 'MulterError') {
    const multerError = error as any;
    switch (multerError.code) {
      case 'LIMIT_FILE_SIZE':
        return new FileUploadError('File size too large');
      case 'LIMIT_FILE_COUNT':
        return new FileUploadError('Too many files');
      case 'LIMIT_UNEXPECTED_FILE':
        return new FileUploadError('Unexpected file field');
      default:
        return new FileUploadError(multerError.message);
    }
  }

  // Default to internal server error
  return new AppError('Internal server error', 500, false);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Error response formatter
export const formatErrorResponse = (error: AppError, isDevelopment: boolean = false) => {
  const response: any = {
    error: error.message,
    code: error.code,
    statusCode: error.statusCode,
  };

  if (isDevelopment) {
    response.stack = error.stack;
    response.details = (error as any).details;
  }

  return response;
};