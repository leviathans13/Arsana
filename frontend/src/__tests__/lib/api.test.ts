/**
 * @jest-environment jsdom
 */

// Mock axios before importing anything else
jest.mock('axios', () => {
  const mockInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: {
        use: jest.fn(),
      },
      response: {
        use: jest.fn(),
      },
    },
  };
  
  return {
    create: jest.fn(() => mockInstance),
    __mockInstance: mockInstance, // Export mock instance for tests
  };
});

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

// Mock js-cookie
jest.mock('js-cookie', () => ({
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
}));

import axios from 'axios';
import apiClient from '../../lib/api';

const mockedAxios = axios as jest.Mocked<typeof axios> & { __mockInstance: any };
const mockInstance = mockedAxios.__mockInstance;

// Mock window.location
delete (window as any).location;
window.location = { href: '' } as any;

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Auth Methods', () => {
    it('should login successfully', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' };
      const mockResponse = {
        data: {
          token: 'mock-jwt-token',
          user: { id: '1', email: 'test@example.com', name: 'Test User', role: 'STAFF' }
        }
      };

      // Get the mock instance and set up the post method
      mockInstance.post.mockResolvedValue(mockResponse);

      const result = await apiClient.login(credentials);

      expect(mockInstance.post).toHaveBeenCalledWith('/auth/login', credentials);
      expect(result).toEqual(mockResponse.data);
    });

    it('should register successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        role: 'STAFF'
      };
      const mockResponse = {
        data: {
          token: 'new-user-token',
          user: { id: '2', email: 'newuser@example.com', name: 'New User', role: 'STAFF' }
        }
      };

      
      mockInstance.post.mockResolvedValue(mockResponse);

      const result = await apiClient.register(userData);

      expect(mockInstance.post).toHaveBeenCalledWith('/auth/register', userData);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('User Methods', () => {
    it('should get current user', async () => {
      const mockResponse = {
        data: { id: '1', email: 'test@example.com', name: 'Test User', role: 'STAFF' }
      };

      
      mockInstance.get.mockResolvedValue(mockResponse);

      const result = await apiClient.getCurrentUser();

      expect(mockInstance.get).toHaveBeenCalledWith('/users/me');
      expect(result).toEqual(mockResponse.data);
    });

    it('should get all users', async () => {
      const mockResponse = {
        data: [
          { id: '1', email: 'user1@example.com', name: 'User 1', role: 'STAFF' },
          { id: '2', email: 'user2@example.com', name: 'User 2', role: 'ADMIN' }
        ]
      };

      
      mockInstance.get.mockResolvedValue(mockResponse);

      const result = await apiClient.getUsers();

      expect(mockInstance.get).toHaveBeenCalledWith('/users');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Incoming Letters Methods', () => {
    it('should get incoming letters with parameters', async () => {
      const params = { page: 1, limit: 10, search: 'test', category: 'GENERAL' };
      const mockResponse = {
        data: {
          letters: [
            { id: '1', subject: 'Test Letter', letterNumber: 'IN/001/2023' }
          ],
          pagination: { current: 1, limit: 10, total: 1, pages: 1 }
        }
      };

      
      mockInstance.get.mockResolvedValue(mockResponse);

      const result = await apiClient.getIncomingLetters(params);

      expect(mockInstance.get).toHaveBeenCalledWith('/incoming-letters', { params });
      expect(result).toEqual(mockResponse.data);
    });

    it('should get incoming letter by id', async () => {
      const letterId = 'letter-123';
      const mockResponse = {
        data: { id: letterId, subject: 'Test Letter', letterNumber: 'IN/001/2023' }
      };

      
      mockInstance.get.mockResolvedValue(mockResponse);

      const result = await apiClient.getIncomingLetterById(letterId);

      expect(mockInstance.get).toHaveBeenCalledWith(`/incoming-letters/${letterId}`);
      expect(result).toEqual(mockResponse.data);
    });

    it('should create incoming letter', async () => {
      const letterData = new FormData();
      letterData.append('subject', 'New Letter');
      letterData.append('sender', 'John Doe');

      const mockResponse = {
        data: { id: 'new-letter-id', subject: 'New Letter', sender: 'John Doe' }
      };

      
      mockInstance.post.mockResolvedValue(mockResponse);

      const result = await apiClient.createIncomingLetter(letterData);

      expect(mockInstance.post).toHaveBeenCalledWith('/incoming-letters', letterData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should update incoming letter', async () => {
      const letterId = 'letter-123';
      const letterData = new FormData();
      letterData.append('subject', 'Updated Letter');

      const mockResponse = {
        data: { id: letterId, subject: 'Updated Letter' }
      };

      
      mockInstance.put.mockResolvedValue(mockResponse);

      const result = await apiClient.updateIncomingLetter(letterId, letterData);

      expect(mockInstance.put).toHaveBeenCalledWith(`/incoming-letters/${letterId}`, letterData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should delete incoming letter', async () => {
      const letterId = 'letter-123';
      const mockResponse = { data: { message: 'Letter deleted successfully' } };

      
      mockInstance.delete.mockResolvedValue(mockResponse);

      const result = await apiClient.deleteIncomingLetter(letterId);

      expect(mockInstance.delete).toHaveBeenCalledWith(`/incoming-letters/${letterId}`);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Notifications Methods', () => {
    it('should get notifications with parameters', async () => {
      const params = { page: 1, limit: 10, unreadOnly: true };
      const mockResponse = {
        data: {
          notifications: [
            { id: '1', title: 'Test Notification', message: 'Test message', isRead: false }
          ],
          pagination: { current: 1, limit: 10, total: 1, pages: 1 },
          unreadCount: 1
        }
      };

      
      mockInstance.get.mockResolvedValue(mockResponse);

      const result = await apiClient.getNotifications(params);

      expect(mockInstance.get).toHaveBeenCalledWith('/notifications', { params });
      expect(result).toEqual(mockResponse.data);
    });

    it('should mark notification as read', async () => {
      const notificationId = 'notification-123';
      const mockResponse = { data: { message: 'Notification marked as read' } };

      
      mockInstance.put.mockResolvedValue(mockResponse);

      const result = await apiClient.markNotificationAsRead(notificationId);

      expect(mockInstance.put).toHaveBeenCalledWith(`/notifications/${notificationId}/read`);
      expect(result).toEqual(mockResponse.data);
    });

    it('should mark all notifications as read', async () => {
      const mockResponse = { data: { message: 'All notifications marked as read' } };

      
      mockInstance.put.mockResolvedValue(mockResponse);

      const result = await apiClient.markAllNotificationsAsRead();

      expect(mockInstance.put).toHaveBeenCalledWith('/notifications/read-all');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Calendar Methods', () => {
    it('should get calendar events with date range', async () => {
      const params = { start: '2023-12-01', end: '2023-12-31' };
      const mockResponse = {
        data: {
          events: [
            {
              id: '1',
              title: 'Meeting',
              date: '2023-12-15T10:00:00Z',
              location: 'Conference Room',
              type: 'incoming',
              letterNumber: 'IN/001/2023'
            }
          ]
        }
      };

      
      mockInstance.get.mockResolvedValue(mockResponse);

      const result = await apiClient.getCalendarEvents(params);

      expect(mockInstance.get).toHaveBeenCalledWith('/calendar/events', { params });
      expect(result).toEqual(mockResponse.data);
    });

    it('should get upcoming events with limit', async () => {
      const params = { limit: 5 };
      const mockResponse = {
        data: {
          events: [
            {
              id: '1',
              title: 'Upcoming Meeting',
              date: '2023-12-20T10:00:00Z',
              location: 'Board Room',
              type: 'outgoing',
              letterNumber: 'OUT/001/2023'
            }
          ]
        }
      };

      
      mockInstance.get.mockResolvedValue(mockResponse);

      const result = await apiClient.getUpcomingEvents(params);

      expect(mockInstance.get).toHaveBeenCalledWith('/calendar/upcoming', { params });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Health Check', () => {
    it('should perform health check', async () => {
      const mockResponse = {
        data: {
          status: 'OK',
          timestamp: '2023-12-15T10:00:00Z',
          environment: 'test',
          uptime: 12345,
          memory: { rss: 1000000, heapTotal: 2000000, heapUsed: 1500000 },
          version: 'v18.17.0'
        }
      };

      
      mockInstance.get.mockResolvedValue(mockResponse);

      const result = await apiClient.healthCheck();

      expect(mockInstance.get).toHaveBeenCalledWith('/health');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      
      const networkError = new Error('Network Error');
      mockInstance.get.mockRejectedValue(networkError);

      await expect(apiClient.getCurrentUser()).rejects.toThrow('Network Error');
    });

    it('should handle HTTP errors', async () => {
      
      const httpError = {
        response: {
          status: 404,
          data: { error: 'Not found' }
        }
      };
      mockInstance.get.mockRejectedValue(httpError);

      await expect(apiClient.getCurrentUser()).rejects.toEqual(httpError);
    });
  });
});