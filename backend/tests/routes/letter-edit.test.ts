import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';

// Mock Prisma Client first
const mockPrismaClient = {
  incomingLetter: {
    findUnique: jest.fn() as jest.MockedFunction<any>,
  },
  outgoingLetter: {
    findUnique: jest.fn() as jest.MockedFunction<any>,
  }
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient),
}));

// Mock the authentication middleware
jest.mock('../../src/middleware/auth', () => ({
  authenticate: jest.fn((req: any, res: any, next: any) => {
    req.user = { userId: 'test-user', role: 'ADMIN' };
    next();
  })
}));

import incomingLetterRoutes from '../../src/routes/incomingLetter.routes';
import outgoingLetterRoutes from '../../src/routes/outgoingLetter.routes';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/incoming-letters', incomingLetterRoutes);
app.use('/api/outgoing-letters', outgoingLetterRoutes);

describe('Letter Edit Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Incoming Letters', () => {
    it('should have GET /:id/edit route that calls showEditForm', async () => {
      const mockLetter = {
        id: 'test-id',
        letterNumber: 'L001',
        subject: 'Test Subject',
        sender: 'Test Sender',
        recipient: 'Test Recipient',
        processor: 'Test Processor',
        userId: 'test-user',
        user: { id: 'test-user', name: 'Test User', email: 'test@example.com' },
        dispositions: []
      };

      mockPrismaClient.incomingLetter.findUnique.mockResolvedValue(mockLetter);

      const response = await request(app)
        .get('/api/incoming-letters/test-id/edit')
        .expect(200);

      expect(response.body).toEqual(mockLetter);
      expect(mockPrismaClient.incomingLetter.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          dispositions: {
            include: {
              incomingLetter: {
                select: {
                  id: true,
                  letterNumber: true,
                  subject: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });
    });

    it('should return 404 for non-existent letter in edit route', async () => {
      mockPrismaClient.incomingLetter.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/incoming-letters/non-existent/edit')
        .expect(404);

      expect(response.body).toEqual({ error: 'Data not found' });
    });
  });

  describe('Outgoing Letters', () => {
    it('should have GET /:id/edit route that calls showEditForm', async () => {
      const mockLetter = {
        id: 'test-id',
        letterNumber: 'L001',
        subject: 'Test Subject',
        sender: 'Test Sender',
        recipient: 'Test Recipient',
        processor: 'Test Processor',
        userId: 'test-user',
        user: { id: 'test-user', name: 'Test User', email: 'test@example.com' }
      };

      mockPrismaClient.outgoingLetter.findUnique.mockResolvedValue(mockLetter);

      const response = await request(app)
        .get('/api/outgoing-letters/test-id/edit')
        .expect(200);

      expect(response.body).toEqual(mockLetter);
      expect(mockPrismaClient.outgoingLetter.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
    });

    it('should return 404 for non-existent letter in edit route', async () => {
      mockPrismaClient.outgoingLetter.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/outgoing-letters/non-existent/edit')
        .expect(404);

      expect(response.body).toEqual({ error: 'Data not found' });
    });
  });
});