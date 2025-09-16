import { Request, Response, NextFunction } from 'express';
import { errorHandler, CustomError } from '../../src/middleware/errorHandler';

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

import logger from '../../src/utils/logger';
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();
    mockNext = jest.fn();

    mockRequest = {
      method: 'GET',
      url: '/test',
      params: {},
      query: {},
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-value'),
    };

    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    jest.clearAllMocks();
  });

  describe('Basic Error Handling', () => {
    it('should handle generic errors with default 500 status', () => {
      const error = new Error('Generic error') as CustomError;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Generic error'
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle errors with custom status code', () => {
      const error = new Error('Custom error') as CustomError;
      error.statusCode = 422;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(422);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Custom error'
      });
    });

    it('should handle errors without message', () => {
      const error = new Error() as CustomError;
      error.message = '';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockJson).toHaveBeenCalledWith({
        error: 'Internal Server Error'
      });
    });
  });

  describe('Prisma Error Handling', () => {
    it('should handle P2002 (unique constraint violation)', () => {
      const error = new Error('Unique constraint failed') as CustomError;
      error.code = 'P2002';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Resource already exists'
      });
    });

    it('should handle P2025 (record not found)', () => {
      const error = new Error('Record not found') as CustomError;
      error.code = 'P2025';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Resource not found'
      });
    });
  });

  describe('JWT Error Handling', () => {
    it('should handle JsonWebTokenError', () => {
      const error = new Error('Invalid token') as CustomError;
      error.name = 'JsonWebTokenError';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid token'
      });
    });

    it('should handle TokenExpiredError', () => {
      const error = new Error('Token expired') as CustomError;
      error.name = 'TokenExpiredError';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Token expired'
      });
    });
  });

  describe('Multer Error Handling', () => {
    it('should handle LIMIT_FILE_SIZE error', () => {
      const error = new Error('File too large') as CustomError;
      error.name = 'MulterError';
      error.code = 'LIMIT_FILE_SIZE';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'File size too large'
      });
    });

    it('should handle LIMIT_UNEXPECTED_FILE error', () => {
      const error = new Error('Unexpected file') as CustomError;
      error.name = 'MulterError';
      error.code = 'LIMIT_UNEXPECTED_FILE';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Unexpected file field'
      });
    });
  });

  describe('Validation Error Handling', () => {
    it('should handle ZodError', () => {
      const error = new Error('Validation failed') as CustomError;
      error.name = 'ZodError';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Validation error'
      });
    });
  });

  describe('Logging Behavior', () => {
    it('should log server errors (5xx) with error level', () => {
      const error = new Error('Server error') as CustomError;
      error.statusCode = 500;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Server Error 500: Server error',
        expect.objectContaining({
          error: expect.objectContaining({
            name: 'Error',
            message: 'Server error'
          }),
          statusCode: 500
        })
      );
    });

    it('should log client errors (4xx) with warn level', () => {
      const error = new Error('Client error') as CustomError;
      error.statusCode = 400;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Client Error 400: Client error',
        expect.objectContaining({
          statusCode: 400
        })
      );
    });

    it('should log other errors with info level', () => {
      const error = new Error('Other error') as CustomError;
      error.statusCode = 200;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Error 200: Other error',
        expect.objectContaining({
          statusCode: 200
        })
      );
    });

    it('should include request context in logs', () => {
      const error = new Error('Test error') as CustomError;
      mockRequest.method = 'POST';
      mockRequest.url = '/api/test';
      mockRequest.params = { id: '123' };
      mockRequest.query = { filter: 'active' };
      (mockRequest as any).user = { userId: 'user-123' };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          request: expect.objectContaining({
            method: 'POST',
            url: '/api/test',
            params: { id: '123' },
            query: { filter: 'active' },
            userId: 'user-123'
          })
        })
      );
    });
  });

  describe('Development Environment', () => {
    it('should include stack trace in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Dev error') as CustomError;
      error.stack = 'Error stack trace';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockJson).toHaveBeenCalledWith({
        error: 'Dev error',
        stack: 'Error stack trace',
        details: expect.any(Object)
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should not include stack trace in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Prod error') as CustomError;
      error.stack = 'Error stack trace';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockJson).toHaveBeenCalledWith({
        error: 'Prod error'
      });

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Edge Cases', () => {
    it('should handle errors with null message', () => {
      const error = { message: null, statusCode: 400 } as any;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockJson).toHaveBeenCalledWith({
        error: 'Internal Server Error'
      });
    });

    it('should handle undefined statusCode', () => {
      const error = new Error('Test') as CustomError;
      error.statusCode = undefined;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });

    it('should handle missing request headers gracefully', () => {
      const error = new Error('Test error') as CustomError;
      mockRequest.get = jest.fn().mockReturnValue(undefined);

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          request: expect.objectContaining({
            headers: expect.objectContaining({
              'user-agent': undefined,
              'content-type': undefined,
              'origin': undefined
            })
          })
        })
      );
    });

    it('should handle missing IP address', () => {
      const error = new Error('Test error') as CustomError;
      (mockRequest as any).ip = undefined;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          request: expect.objectContaining({
            ip: 'unknown'
          })
        })
      );
    });
  });
});