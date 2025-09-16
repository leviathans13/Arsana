import { Request, Response } from 'express';
import { notFoundHandler } from '../../src/middleware/notFoundHandler';

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  warn: jest.fn(),
}));

import logger from '../../src/utils/logger';
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Not Found Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();

    mockRequest = {
      method: 'GET',
      originalUrl: '/api/nonexistent',
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

  describe('Basic Functionality', () => {
    it('should return 404 status for non-existent routes', () => {
      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Route /api/nonexistent not found'
      });
    });

    it('should log 404 errors with warn level', () => {
      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '404 - Route not found',
        expect.objectContaining({
          request: expect.objectContaining({
            method: 'GET',
            url: '/api/nonexistent'
          })
        })
      );
    });
  });

  describe('Request Context Logging', () => {
    it('should log complete request context', () => {
      mockRequest.method = 'POST';
      mockRequest.originalUrl = '/api/test/endpoint';
      mockRequest.params = { id: '123' };
      mockRequest.query = { filter: 'active', sort: 'date' };
      (mockRequest as any).user = { userId: 'user-456' };

      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '404 - Route not found',
        expect.objectContaining({
          request: expect.objectContaining({
            method: 'POST',
            url: '/api/test/endpoint',
            params: { id: '123' },
            query: { filter: 'active', sort: 'date' },
            userId: 'user-456'
          })
        })
      );
    });

    it('should include HTTP headers in context', () => {
      const mockGet = jest.fn()
        .mockReturnValueOnce('Mozilla/5.0 Test Browser')
        .mockReturnValueOnce('https://example.com')
        .mockReturnValueOnce('https://google.com');
      
      mockRequest.get = mockGet;

      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '404 - Route not found',
        expect.objectContaining({
          request: expect.objectContaining({
            headers: {
              'user-agent': 'Mozilla/5.0 Test Browser',
              'origin': 'https://example.com',
              'referer': 'https://google.com'
            }
          })
        })
      );

      expect(mockGet).toHaveBeenCalledWith('user-agent');
      expect(mockGet).toHaveBeenCalledWith('origin');
      expect(mockGet).toHaveBeenCalledWith('referer');
    });

    it('should handle missing IP address', () => {
      (mockRequest as any).ip = undefined;

      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '404 - Route not found',
        expect.objectContaining({
          request: expect.objectContaining({
            ip: 'unknown'
          })
        })
      );
    });

    it('should handle missing user context', () => {
      // No user property set
      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '404 - Route not found',
        expect.objectContaining({
          request: expect.objectContaining({
            userId: undefined
          })
        })
      );
    });
  });

  describe('Different HTTP Methods', () => {
    it('should handle GET requests', () => {
      mockRequest.method = 'GET';
      mockRequest.originalUrl = '/api/users/123';

      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        error: 'Route /api/users/123 not found'
      });
    });

    it('should handle POST requests', () => {
      mockRequest.method = 'POST';
      mockRequest.originalUrl = '/api/create-user';

      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        error: 'Route /api/create-user not found'
      });
    });

    it('should handle PUT requests', () => {
      mockRequest.method = 'PUT';
      mockRequest.originalUrl = '/api/update/456';

      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        error: 'Route /api/update/456 not found'
      });
    });

    it('should handle DELETE requests', () => {
      mockRequest.method = 'DELETE';
      mockRequest.originalUrl = '/api/delete/789';

      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        error: 'Route /api/delete/789 not found'
      });
    });
  });

  describe('URL Variations', () => {
    it('should handle root path', () => {
      mockRequest.originalUrl = '/';

      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        error: 'Route / not found'
      });
    });

    it('should handle nested paths', () => {
      mockRequest.originalUrl = '/api/v1/users/123/profile/settings';

      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        error: 'Route /api/v1/users/123/profile/settings not found'
      });
    });

    it('should handle URLs with query parameters', () => {
      mockRequest.originalUrl = '/api/search?q=test&limit=10';

      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        error: 'Route /api/search?q=test&limit=10 not found'
      });
    });

    it('should handle URLs with special characters', () => {
      mockRequest.originalUrl = '/api/files/document%20with%20spaces.pdf';

      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        error: 'Route /api/files/document%20with%20spaces.pdf not found'
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined originalUrl', () => {
      (mockRequest as any).originalUrl = undefined;

      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        error: 'Route undefined not found'
      });
    });

    it('should handle empty originalUrl', () => {
      (mockRequest as any).originalUrl = '';

      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        error: 'Route  not found'
      });
    });

    it('should handle missing headers gracefully', () => {
      mockRequest.get = jest.fn().mockReturnValue(undefined);

      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '404 - Route not found',
        expect.objectContaining({
          request: expect.objectContaining({
            headers: {
              'user-agent': undefined,
              'origin': undefined,
              'referer': undefined
            }
          })
        })
      );
    });
  });

  describe('Security Considerations', () => {
    it('should not expose sensitive information in error message', () => {
      mockRequest.originalUrl = '/admin/secret-endpoint';

      notFoundHandler(mockRequest as Request, mockResponse as Response);

      const errorResponse = mockJson.mock.calls[0][0];
      expect(errorResponse.error).not.toContain('admin');
      expect(errorResponse.error).toBe('Route /admin/secret-endpoint not found');
    });

    it('should not include request body in logs for security', () => {
      (mockRequest as any).body = { password: 'secret123', apiKey: 'key123' };

      notFoundHandler(mockRequest as Request, mockResponse as Response);

      const logCall = (mockLogger.warn.mock.calls[0] as unknown as [string, any])[1];
      expect(logCall?.request).not.toHaveProperty('body');
    });
  });
});