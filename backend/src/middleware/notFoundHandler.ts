import { Request, Response } from 'express';
import logger from '../utils/logger';

export const notFoundHandler = (req: Request, res: Response): void => {
  const errorMessage = `Route ${req.originalUrl} not found`;
  
  // Log 404 errors with context
  logger.warn('404 - Route not found', {
    request: {
      method: req.method,
      url: req.originalUrl,
      params: req.params,
      query: req.query,
      headers: {
        'user-agent': req.get('user-agent'),
        'origin': req.get('origin'),
        'referer': req.get('referer')
      },
      ip: req.ip || 'unknown',
      userId: (req as any).user?.userId
    }
  });

  res.status(404).json({
    error: errorMessage
  });
};