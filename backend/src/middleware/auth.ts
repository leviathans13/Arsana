import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/auth';
import { securityLogger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      securityLogger.unauthorizedAccess(req.ip || 'unknown', req.originalUrl);
      res.status(401).json({ error: 'Access token is required' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = verifyToken(token);
    
    req.user = decoded;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      securityLogger.tokenExpired(req.headers.authorization?.substring(7) || 'unknown', req.ip || 'unknown');
    } else {
      securityLogger.unauthorizedAccess(req.ip || 'unknown', req.originalUrl);
    }
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      securityLogger.unauthorizedAccess(req.ip || 'unknown', req.originalUrl);
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      securityLogger.unauthorizedAccess(req.ip || 'unknown', req.originalUrl, req.user.userId);
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};