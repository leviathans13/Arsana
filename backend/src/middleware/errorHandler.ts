import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';
  let errorCode = error.code;

  // Prisma errors
  if (error.code === 'P2002') {
    statusCode = 400;
    message = 'Resource already exists';
  }

  if (error.code === 'P2025') {
    statusCode = 404;
    message = 'Resource not found';
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Multer errors
  if (error.name === 'MulterError') {
    if (error.code === 'LIMIT_FILE_SIZE') {
      statusCode = 400;
      message = 'File size too large';
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      statusCode = 400;
      message = 'Unexpected file field';
    }
  }

  // Validation errors (Zod)
  if (error.name === 'ZodError') {
    statusCode = 400;
    message = 'Validation error';
  }

  // Log the error with appropriate level and context
  const errorContext = {
    error: {
      name: error.name,
      message: error.message,
      code: errorCode,
      stack: error.stack
    },
    request: {
      method: req.method,
      url: req.url,
      params: req.params,
      query: req.query,
      headers: {
        'user-agent': req.get('user-agent'),
        'content-type': req.get('content-type'),
        'origin': req.get('origin')
      },
      ip: req.ip || 'unknown',
      userId: (req as any).user?.userId
    },
    statusCode
  };

  // Log based on error severity
  if (statusCode >= 500) {
    logger.error(`Server Error ${statusCode}: ${message}`, errorContext);
  } else if (statusCode >= 400) {
    logger.warn(`Client Error ${statusCode}: ${message}`, errorContext);
  } else {
    logger.info(`Error ${statusCode}: ${message}`, errorContext);
  }

  // Send error response
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: error.stack,
      details: errorContext 
    })
  });
};