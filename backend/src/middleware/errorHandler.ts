import { Request, Response, NextFunction } from 'express';
import { AppError, handleError, formatErrorResponse } from '../utils/errors';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const appError = handleError(error);
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const response = formatErrorResponse(appError, isDevelopment);

  // Log error details
  console.error(`Error ${appError.statusCode}: ${appError.message}`, {
    error: appError,
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.userId,
    },
    stack: isDevelopment ? appError.stack : undefined,
  });

  res.status(appError.statusCode).json(response);
};