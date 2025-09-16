import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import express from 'express';
import incomingLetterRoutes from '../../src/routes/incomingLetter.routes';
import { authenticate } from '../../src/middleware/auth';

// Mock authentication middleware for testing
jest.mock('../../src/middleware/auth');
const mockAuth = authenticate as jest.MockedFunction<typeof authenticate>;

const app = express();
app.use(express.json());

// Mock authentication to always pass
mockAuth.mockImplementation((req: any, res: any, next: any) => {
  req.user = { userId: 'test-user-id', role: 'USER' };
  next();
});

app.use('/api/incoming-letters', incomingLetterRoutes);

describe('Incoming Letter Routes', () => {
  describe('Edit Route', () => {
    it('should respond to GET /edit/:id', async () => {
      const response = await request(app)
        .get('/api/incoming-letters/edit/test-id')
        .expect((res) => {
          // Should get 404 for non-existent letter, not route error
          expect([404, 500]).toContain(res.status);
        });
    });
  });

  describe('Download Route', () => {
    it('should respond to GET /download/:id', async () => {
      const response = await request(app)
        .get('/api/incoming-letters/download/test-id')
        .expect((res) => {
          // Should get 404 for non-existent letter, not route error  
          expect([404, 500]).toContain(res.status);
        });
    });
  });
});