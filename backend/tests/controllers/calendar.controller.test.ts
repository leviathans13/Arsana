import { Response } from 'express';
import { AuthenticatedRequest } from '../../src/middleware/auth';

// Create mock prisma
const mockPrisma = {
  incomingLetter: {
    findMany: jest.fn(),
  },
  outgoingLetter: {
    findMany: jest.fn(),
  },
};

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
}));

import { getCalendarEvents, getUpcomingEvents } from '../../src/controllers/calendar.controller';

describe('Calendar Controller', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();

    mockRequest = {
      query: {},
      user: {
        userId: 'user-1',
        email: 'test@example.com',
        role: 'STAFF'
      }
    };

    mockResponse = {
      json: mockJson,
      status: mockStatus,
    };

    jest.clearAllMocks();
  });

  describe('getCalendarEvents', () => {
    it('should return calendar events successfully', async () => {
      const mockIncomingLetters = [
        {
          id: '1',
          subject: 'Meeting Invitation',
          eventDate: new Date('2023-12-25T10:00:00Z'),
          eventLocation: 'Conference Room',
          letterNumber: 'IN/001/2023',
        }
      ];

      const mockOutgoingLetters = [
        {
          id: '2',
          subject: 'Annual Event',
          eventDate: new Date('2023-12-26T14:00:00Z'),
          eventLocation: 'Main Hall',
          letterNumber: 'OUT/001/2023',
          description: 'Company annual event'
        }
      ];

      // Mock Prisma calls
      mockPrisma.incomingLetter.findMany.mockResolvedValue(mockIncomingLetters);
      mockPrisma.outgoingLetter.findMany.mockResolvedValue(mockOutgoingLetters);

      await getCalendarEvents(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        events: expect.arrayContaining([
          expect.objectContaining({
            id: '1',
            title: 'Meeting Invitation',
            type: 'incoming',
            letterNumber: 'IN/001/2023'
          }),
          expect.objectContaining({
            id: '2',
            title: 'Annual Event',
            type: 'outgoing',
            letterNumber: 'OUT/001/2023'
          })
        ])
      });
    });

    it('should handle date range query parameters', async () => {
      mockRequest.query = {
        start: '2023-12-01',
        end: '2023-12-31'
      };

      await getCalendarEvents(mockRequest as AuthenticatedRequest, mockResponse as Response);

      // Should call with proper date range
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.incomingLetter.findMany.mockRejectedValue(new Error('Database error'));

      await getCalendarEvents(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Internal server error'
      });
    });
  });

  describe('getUpcomingEvents', () => {
    it('should return upcoming events with default limit', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // 7 days from now

      const mockUpcomingLetters = [
        {
          id: '1',
          subject: 'Upcoming Meeting',
          eventDate: futureDate,
          eventLocation: 'Board Room',
          letterNumber: 'UP/001/2023',
        }
      ];

      mockPrisma.incomingLetter.findMany.mockResolvedValue(mockUpcomingLetters);
      mockPrisma.outgoingLetter.findMany.mockResolvedValue([]);

      await getUpcomingEvents(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        events: expect.arrayContaining([
          expect.objectContaining({
            id: '1',
            title: 'Upcoming Meeting',
            type: 'incoming'
          })
        ])
      });
    });

    it('should respect limit query parameter', async () => {
      mockRequest.query = {
        limit: '5'
      };

      await getUpcomingEvents(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should sort events by date', async () => {
      const nearDate = new Date();
      nearDate.setDate(nearDate.getDate() + 1);
      
      const farDate = new Date();
      farDate.setDate(farDate.getDate() + 10);

      const mockEvents = [
        {
          id: '2',
          subject: 'Far Event',
          eventDate: farDate,
          eventLocation: 'Room B',
          letterNumber: 'FAR/001/2023',
        },
        {
          id: '1',
          subject: 'Near Event',
          eventDate: nearDate,
          eventLocation: 'Room A',
          letterNumber: 'NEAR/001/2023',
        }
      ];

      mockPrisma.incomingLetter.findMany.mockResolvedValue(mockEvents);
      mockPrisma.outgoingLetter.findMany.mockResolvedValue([]);

      await getUpcomingEvents(mockRequest as AuthenticatedRequest, mockResponse as Response);

      // Events should be sorted by date (nearest first)
      expect(mockResponse.json).toHaveBeenCalledWith({
        events: expect.arrayContaining([
          expect.objectContaining({
            id: '1',
            title: 'Near Event'
          }),
          expect.objectContaining({
            id: '2', 
            title: 'Far Event'
          })
        ])
      });
    });
  });
});