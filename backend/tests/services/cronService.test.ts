import { startCronJobs } from '../../src/services/cronService';

// Mock node-cron
jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    incomingLetter: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    outgoingLetter: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
  })),
}));

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransporter: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  }),
}));

describe('Cron Service', () => {
  let mockCron: any;
  let mockPrisma: any;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console.log to avoid cluttering test output
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // Get mocked modules
    mockCron = require('node-cron');
    const { PrismaClient } = require('@prisma/client');
    mockPrisma = new PrismaClient();
    
    // Reset cron schedule mock to default behavior
    mockCron.schedule.mockImplementation(() => ({}));
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('startCronJobs', () => {
    it('should schedule all cron jobs successfully', () => {
      startCronJobs();

      // Should schedule multiple cron jobs
      expect(mockCron.schedule).toHaveBeenCalledTimes(3);
      
      // Check if cron jobs are scheduled with correct patterns
      expect(mockCron.schedule).toHaveBeenCalledWith('0 9 * * *', expect.any(Function)); // Daily at 9 AM
      expect(mockCron.schedule).toHaveBeenCalledWith('0 18 * * *', expect.any(Function)); // Daily at 6 PM
      expect(mockCron.schedule).toHaveBeenCalledWith('0 8 * * 1', expect.any(Function)); // Weekly on Monday at 8 AM

      expect(console.log).toHaveBeenCalledWith('Starting cron jobs...');
      expect(console.log).toHaveBeenCalledWith('Cron jobs started successfully');
    });

    it('should handle cron job scheduling errors gracefully', () => {
      mockCron.schedule.mockImplementation(() => {
        throw new Error('Cron scheduling error');
      });

      expect(() => startCronJobs()).not.toThrow();
    });
  });

  describe('Cron Job Functions', () => {
    it('should schedule upcoming events check', () => {
      startCronJobs();

      // Get the first scheduled function (upcoming events check)
      const upcomingEventsJob = mockCron.schedule.mock.calls[0][1];
      
      expect(upcomingEventsJob).toBeInstanceOf(Function);
    });

    it('should schedule overdue invitations check', () => {
      startCronJobs();

      // Get the second scheduled function (overdue invitations check)
      const overdueInvitationsJob = mockCron.schedule.mock.calls[1][1];
      
      expect(overdueInvitationsJob).toBeInstanceOf(Function);
    });

    it('should schedule weekly summary generation', () => {
      startCronJobs();

      // Get the third scheduled function (weekly summary)
      const weeklySummaryJob = mockCron.schedule.mock.calls[2][1];
      
      expect(weeklySummaryJob).toBeInstanceOf(Function);
    });
  });

  describe('Cron Job Execution', () => {
    beforeEach(() => {
      // Mock current date to make tests predictable
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2023-12-15T10:00:00Z')); // Friday
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should execute upcoming events check job', async () => {
      const mockUpcomingEvents = [
        {
          id: '1',
          subject: 'Upcoming Meeting',
          eventDate: new Date('2023-12-16T09:00:00Z'),
          eventLocation: 'Conference Room',
          user: { email: 'user@example.com', name: 'Test User' }
        }
      ];

      mockPrisma.incomingLetter.findMany.mockResolvedValue(mockUpcomingEvents);
      mockPrisma.outgoingLetter.findMany.mockResolvedValue([]);

      startCronJobs();

      // Execute the upcoming events check job
      const upcomingEventsJob = mockCron.schedule.mock.calls[0][1];
      await upcomingEventsJob();

      expect(console.log).toHaveBeenCalledWith('Running upcoming events check...');
      expect(mockPrisma.incomingLetter.findMany).toHaveBeenCalled();
      expect(mockPrisma.outgoingLetter.findMany).toHaveBeenCalled();
    });

    it('should execute overdue invitations check job', async () => {
      const mockOverdueIncoming = [
        {
          id: '1',
          subject: 'Overdue Meeting',
          eventDate: new Date('2023-12-10T09:00:00Z'), // Past date
          user: { email: 'user@example.com', name: 'Test User' }
        }
      ];

      mockPrisma.incomingLetter.findMany.mockResolvedValue(mockOverdueIncoming);
      mockPrisma.outgoingLetter.findMany.mockResolvedValue([]);

      startCronJobs();

      // Execute the overdue invitations check job
      const overdueInvitationsJob = mockCron.schedule.mock.calls[1][1];
      await overdueInvitationsJob();

      expect(console.log).toHaveBeenCalledWith('Running overdue invitations check...');
      expect(mockPrisma.incomingLetter.findMany).toHaveBeenCalled();
    });

    it('should execute weekly summary job', async () => {
      mockPrisma.incomingLetter.count.mockResolvedValue(5);
      mockPrisma.outgoingLetter.count.mockResolvedValue(3);
      mockPrisma.notification.create.mockResolvedValue({ id: 'notification-1' });

      startCronJobs();

      // Execute the weekly summary job
      const weeklySummaryJob = mockCron.schedule.mock.calls[2][1];
      await weeklySummaryJob();

      expect(console.log).toHaveBeenCalledWith('Generating weekly summary...');
      expect(mockPrisma.incomingLetter.count).toHaveBeenCalled();
      expect(mockPrisma.outgoingLetter.count).toHaveBeenCalled();
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          title: 'Weekly Summary',
          message: 'This week: 5 incoming letters, 3 outgoing letters processed.',
          type: 'INFO'
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors in upcoming events check', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockPrisma.incomingLetter.findMany.mockRejectedValue(new Error('Database error'));

      startCronJobs();

      // Execute the upcoming events check job
      const upcomingEventsJob = mockCron.schedule.mock.calls[0][1];
      await upcomingEventsJob();

      expect(console.error).toHaveBeenCalledWith('Error checking upcoming events:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle database errors in overdue invitations check', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockPrisma.incomingLetter.findMany.mockRejectedValue(new Error('Database error'));

      startCronJobs();

      // Execute the overdue invitations check job
      const overdueInvitationsJob = mockCron.schedule.mock.calls[1][1];
      await overdueInvitationsJob();

      expect(console.error).toHaveBeenCalledWith('Error checking overdue invitations:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle database errors in weekly summary', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockPrisma.incomingLetter.count.mockRejectedValue(new Error('Database error'));

      startCronJobs();

      // Execute the weekly summary job
      const weeklySummaryJob = mockCron.schedule.mock.calls[2][1];
      await weeklySummaryJob();

      // Should handle error gracefully and not crash
      expect(console.error).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Date Calculations', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2023-12-15T10:00:00Z')); // Friday
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should calculate week boundaries correctly for weekly summary', async () => {
      mockPrisma.incomingLetter.count.mockResolvedValue(2);
      mockPrisma.outgoingLetter.count.mockResolvedValue(1);
      mockPrisma.notification.create.mockResolvedValue({ id: 'notification-1' });

      startCronJobs();

      // Execute the weekly summary job
      const weeklySummaryJob = mockCron.schedule.mock.calls[2][1];
      await weeklySummaryJob();

      // Verify that count was called with proper date range
      expect(mockPrisma.incomingLetter.count).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: expect.any(Date),
            lte: expect.any(Date)
          }
        }
      });

      expect(mockPrisma.outgoingLetter.count).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: expect.any(Date),
            lte: expect.any(Date)
          }
        }
      });
    });
  });
});