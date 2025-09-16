import request from 'supertest';
import express from 'express';
import { errorHandler } from '../../src/middleware/errorHandler';
import { notFoundHandler } from '../../src/middleware/notFoundHandler';

// Mock logger to avoid console output during tests
jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

describe('API Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      // Simulate the health check endpoint
      app.get('/api/health', (req, res) => {
        const healthData = {
          status: 'OK',
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'test',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: process.version
        };
        res.json(healthData);
      });

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'OK',
        timestamp: expect.any(String),
        environment: expect.any(String),
        uptime: expect.any(Number),
        memory: expect.any(Object),
        version: expect.any(String)
      });

      expect(response.body.memory).toHaveProperty('rss');
      expect(response.body.memory).toHaveProperty('heapTotal');
      expect(response.body.memory).toHaveProperty('heapUsed');
    });

    it('should handle health check errors gracefully', async () => {
      app.get('/api/health', (req, res) => {
        throw new Error('Health check failed');
      });

      app.use(errorHandler);

      const response = await request(app)
        .get('/api/health')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Error Handling Integration', () => {
    beforeEach(() => {
      app.use(notFoundHandler);
      app.use(errorHandler);
    });

    it('should handle 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Route /api/nonexistent not found'
      });
    });

    it('should handle POST to non-existent routes', async () => {
      const response = await request(app)
        .post('/api/nonexistent')
        .send({ data: 'test' })
        .expect(404);

      expect(response.body).toEqual({
        error: 'Route /api/nonexistent not found'
      });
    });

    it('should handle PUT to non-existent routes', async () => {
      const response = await request(app)
        .put('/api/nonexistent/123')
        .send({ data: 'test' })
        .expect(404);

      expect(response.body).toEqual({
        error: 'Route /api/nonexistent/123 not found'
      });
    });

    it('should handle DELETE to non-existent routes', async () => {
      const response = await request(app)
        .delete('/api/nonexistent/123')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Route /api/nonexistent/123 not found'
      });
    });
  });

  describe('Middleware Chain Integration', () => {
    it('should process middleware in correct order', async () => {
      const middlewareOrder: string[] = [];

      app.use((req, res, next) => {
        middlewareOrder.push('middleware1');
        next();
      });

      app.use((req, res, next) => {
        middlewareOrder.push('middleware2');
        next();
      });

      app.get('/api/test', (req, res) => {
        middlewareOrder.push('handler');
        res.json({ order: middlewareOrder });
      });

      app.use(notFoundHandler);

      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.body.order).toEqual(['middleware1', 'middleware2', 'handler']);
    });

    it('should handle errors thrown in middleware', async () => {
      app.use((req, res, next) => {
        if (req.path === '/api/error') {
          throw new Error('Middleware error');
        }
        next();
      });

      app.get('/api/success', (req, res) => {
        res.json({ message: 'Success' });
      });

      app.use(errorHandler);

      // Test error path
      await request(app)
        .get('/api/error')
        .expect(500);

      // Test success path
      await request(app)
        .get('/api/success')
        .expect(200);
    });
  });

  describe('Request Body Parsing', () => {
    beforeEach(() => {
      app.use(express.json());
      app.use(express.urlencoded({ extended: true }));
    });

    it('should parse JSON request bodies', async () => {
      app.post('/api/json', (req, res) => {
        res.json({
          received: req.body,
          type: typeof req.body
        });
      });

      const testData = { name: 'test', value: 123 };

      const response = await request(app)
        .post('/api/json')
        .send(testData)
        .expect(200);

      expect(response.body.received).toEqual(testData);
      expect(response.body.type).toBe('object');
    });

    it('should parse URL-encoded request bodies', async () => {
      app.post('/api/form', (req, res) => {
        res.json({
          received: req.body,
          type: typeof req.body
        });
      });

      const response = await request(app)
        .post('/api/form')
        .type('form')
        .send('name=test&value=123')
        .expect(200);

      expect(response.body.received).toEqual({
        name: 'test',
        value: '123'
      });
    });

    it('should handle malformed JSON gracefully', async () => {
      app.post('/api/json', (req, res) => {
        res.json({ received: req.body });
      });

      app.use(errorHandler);

      const response = await request(app)
        .post('/api/json')
        .type('json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Response Headers', () => {
    it('should set correct content-type for JSON responses', async () => {
      app.get('/api/json', (req, res) => {
        res.json({ message: 'Hello' });
      });

      const response = await request(app)
        .get('/api/json')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should handle custom headers', async () => {
      app.get('/api/custom-headers', (req, res) => {
        res.set('X-Custom-Header', 'test-value');
        res.json({ message: 'With custom header' });
      });

      const response = await request(app)
        .get('/api/custom-headers')
        .expect(200);

      expect(response.headers['x-custom-header']).toBe('test-value');
    });
  });

  describe('Error Response Formats', () => {
    beforeEach(() => {
      app.use(errorHandler);
    });

    it('should return consistent error format for validation errors', async () => {
      app.post('/api/validate', (req, res) => {
        const error = new Error('Validation failed') as any;
        error.name = 'ZodError';
        throw error;
      });

      const response = await request(app)
        .post('/api/validate')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        error: 'Validation error'
      });
    });

    it('should return consistent error format for authentication errors', async () => {
      app.get('/api/protected', (req, res) => {
        const error = new Error('Token invalid') as any;
        error.name = 'JsonWebTokenError';
        throw error;
      });

      const response = await request(app)
        .get('/api/protected')
        .expect(401);

      expect(response.body).toEqual({
        error: 'Invalid token'
      });
    });

    it('should return consistent error format for server errors', async () => {
      app.get('/api/server-error', (req, res) => {
        throw new Error('Internal server error');
      });

      const response = await request(app)
        .get('/api/server-error')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Internal server error'
      });
    });
  });

  describe('Route Parameter Handling', () => {
    it('should handle route parameters correctly', async () => {
      app.get('/api/users/:id', (req, res) => {
        res.json({
          userId: req.params.id,
          type: typeof req.params.id
        });
      });

      const response = await request(app)
        .get('/api/users/123')
        .expect(200);

      expect(response.body).toEqual({
        userId: '123',
        type: 'string'
      });
    });

    it('should handle multiple route parameters', async () => {
      app.get('/api/users/:userId/posts/:postId', (req, res) => {
        res.json({
          params: req.params
        });
      });

      const response = await request(app)
        .get('/api/users/123/posts/456')
        .expect(200);

      expect(response.body.params).toEqual({
        userId: '123',
        postId: '456'
      });
    });

    it('should handle query parameters correctly', async () => {
      app.get('/api/search', (req, res) => {
        res.json({
          query: req.query
        });
      });

      const response = await request(app)
        .get('/api/search?q=test&page=1&limit=10')
        .expect(200);

      expect(response.body.query).toEqual({
        q: 'test',
        page: '1',
        limit: '10'
      });
    });
  });
});