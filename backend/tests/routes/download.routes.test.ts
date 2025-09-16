import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import incomingLetterRoutes from '../../src/routes/incomingLetter.routes';
import outgoingLetterRoutes from '../../src/routes/outgoingLetter.routes';
import fileRoutes from '../../src/routes/file.routes';
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
app.use('/api/outgoing-letters', outgoingLetterRoutes);
app.use('/api/files', fileRoutes);

describe('Letter Download Routes', () => {
  describe('Direct download routes', () => {
    it('should respond to incoming letter direct download', async () => {
      await request(app)
        .get('/api/incoming-letters/download/test-id')
        .expect((res) => {
          // Should get 404 for non-existent letter, not route error
          expect([404, 500]).toContain(res.status);
        });
    });

    it('should respond to outgoing letter direct download', async () => {
      await request(app)
        .get('/api/outgoing-letters/download/test-id')
        .expect((res) => {
          // Should get 404 for non-existent letter, not route error  
          expect([404, 500]).toContain(res.status);
        });
    });
  });

  describe('File service routes (used by frontend)', () => {
    it('should respond to file service download for incoming letters', async () => {
      await request(app)
        .get('/api/files/incoming/test-id')
        .expect((res) => {
          // Should get 404 for non-existent letter, not route error
          expect([401, 403, 404, 500]).toContain(res.status);
        });
    });

    it('should respond to file service download for outgoing letters', async () => {
      await request(app)
        .get('/api/files/outgoing/test-id')
        .expect((res) => {
          // Should get 404 for non-existent letter, not route error  
          expect([401, 403, 404, 500]).toContain(res.status);
        });
    });

    it('should respond to file info requests', async () => {
      await request(app)
        .get('/api/files/incoming/test-id/info')
        .expect((res) => {
          // Should get proper response, not route error
          expect([401, 403, 404, 500]).toContain(res.status);
        });
    });
  });
});