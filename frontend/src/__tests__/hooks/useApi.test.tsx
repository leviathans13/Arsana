/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactNode } from 'react';

// Mock the API client before importing hooks
jest.mock('@/lib/api', () => ({
  default: {
    getIncomingLetters: jest.fn(),
    getIncomingLetterById: jest.fn(),
    createIncomingLetter: jest.fn(),
    updateIncomingLetter: jest.fn(),
    deleteIncomingLetter: jest.fn(),
    getOutgoingLetters: jest.fn(),
    getNotifications: jest.fn(),
    getCalendarEvents: jest.fn(),
    getUpcomingEvents: jest.fn(),
  },
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the utils
jest.mock('@/lib/utils', () => ({
  createFormData: jest.fn((data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key]);
      }
    });
    return formData;
  }),
}));

import {
  useIncomingLetters,
  useIncomingLetter,
  useCreateIncomingLetter,
  useUpdateIncomingLetter,
  useDeleteIncomingLetter,
  useOutgoingLetters,
  useNotifications,
  useCalendarEvents,
  useUpcomingEvents
} from '../../hooks/useApi';

import apiClient from '@/lib/api';
import { toast } from 'react-hot-toast';

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useApi Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useIncomingLetters', () => {
    it('should fetch incoming letters successfully', async () => {
      const mockData = {
        letters: [
          { id: '1', subject: 'Test Letter 1', letterNumber: 'IN/001/2023' },
          { id: '2', subject: 'Test Letter 2', letterNumber: 'IN/002/2023' }
        ],
        pagination: { current: 1, limit: 10, total: 2, pages: 1 }
      };

      mockApiClient.getIncomingLetters.mockResolvedValue(mockData);

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useIncomingLetters({ page: 1, limit: 10 }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockData);
      expect(mockApiClient.getIncomingLetters).toHaveBeenCalledWith({ page: 1, limit: 10 });
    });

    it('should handle search parameters', async () => {
      const mockData = {
        letters: [{ id: '1', subject: 'Search Result', letterNumber: 'IN/001/2023' }],
        pagination: { current: 1, limit: 10, total: 1, pages: 1 }
      };

      mockApiClient.getIncomingLetters.mockResolvedValue(mockData);

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useIncomingLetters({ page: 1, limit: 10, search: 'test', category: 'GENERAL' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApiClient.getIncomingLetters).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: 'test',
        category: 'GENERAL'
      });
    });

    it('should handle loading state', () => {
      mockApiClient.getIncomingLetters.mockReturnValue(new Promise(() => {})); // Never resolves

      const wrapper = createWrapper();
      const { result } = renderHook(() => useIncomingLetters(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should handle error state', async () => {
      const error = new Error('Network error');
      mockApiClient.getIncomingLetters.mockRejectedValue(error);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useIncomingLetters(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });
  });

  describe('useIncomingLetter', () => {
    it('should fetch single incoming letter', async () => {
      const mockLetter = { id: '1', subject: 'Test Letter', letterNumber: 'IN/001/2023' };
      mockApiClient.getIncomingLetterById.mockResolvedValue(mockLetter);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useIncomingLetter('1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockLetter);
      expect(mockApiClient.getIncomingLetterById).toHaveBeenCalledWith('1');
    });

    it('should not fetch when id is empty', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useIncomingLetter(''), { wrapper });

      expect(result.current.isIdle).toBe(true);
      expect(mockApiClient.getIncomingLetterById).not.toHaveBeenCalled();
    });
  });

  describe('useCreateIncomingLetter', () => {
    it('should create incoming letter successfully', async () => {
      const mockCreatedLetter = { id: 'new-1', subject: 'New Letter', letterNumber: 'IN/003/2023' };
      mockApiClient.createIncomingLetter.mockResolvedValue(mockCreatedLetter);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCreateIncomingLetter(), { wrapper });

      const letterData = {
        subject: 'New Letter',
        sender: 'John Doe',
        recipient: 'Jane Smith'
      };

      await result.current.mutateAsync(letterData);

      expect(mockApiClient.createIncomingLetter).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Surat masuk berhasil ditambahkan!');
    });

    it('should handle creation error', async () => {
      const error = { response: { data: { error: 'Validation failed' } } };
      mockApiClient.createIncomingLetter.mockRejectedValue(error);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCreateIncomingLetter(), { wrapper });

      try {
        await result.current.mutateAsync({});
      } catch (e) {
        // Expected to throw
      }

      expect(toast.error).toHaveBeenCalledWith('Validation failed');
    });
  });

  describe('useUpdateIncomingLetter', () => {
    it('should update incoming letter successfully', async () => {
      const mockUpdatedLetter = { id: '1', subject: 'Updated Letter', letterNumber: 'IN/001/2023' };
      mockApiClient.updateIncomingLetter.mockResolvedValue(mockUpdatedLetter);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpdateIncomingLetter(), { wrapper });

      const updateData = { id: '1', subject: 'Updated Letter' };
      await result.current.mutateAsync(updateData);

      expect(mockApiClient.updateIncomingLetter).toHaveBeenCalledWith('1', expect.any(FormData));
      expect(toast.success).toHaveBeenCalledWith('Surat masuk berhasil diperbarui!');
    });
  });

  describe('useDeleteIncomingLetter', () => {
    it('should delete incoming letter successfully', async () => {
      mockApiClient.deleteIncomingLetter.mockResolvedValue({ message: 'Deleted successfully' });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useDeleteIncomingLetter(), { wrapper });

      await result.current.mutateAsync('1');

      expect(mockApiClient.deleteIncomingLetter).toHaveBeenCalledWith('1');
      expect(toast.success).toHaveBeenCalledWith('Surat masuk berhasil dihapus!');
    });

    it('should handle deletion error', async () => {
      const error = { response: { data: { error: 'Cannot delete' } } };
      mockApiClient.deleteIncomingLetter.mockRejectedValue(error);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useDeleteIncomingLetter(), { wrapper });

      try {
        await result.current.mutateAsync('1');
      } catch (e) {
        // Expected to throw
      }

      expect(toast.error).toHaveBeenCalledWith('Cannot delete');
    });
  });

  describe('useOutgoingLetters', () => {
    it('should fetch outgoing letters successfully', async () => {
      const mockData = {
        letters: [
          { id: '1', subject: 'Outgoing Letter 1', letterNumber: 'OUT/001/2023' }
        ],
        pagination: { current: 1, limit: 10, total: 1, pages: 1 }
      };

      mockApiClient.getOutgoingLetters.mockResolvedValue(mockData);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useOutgoingLetters(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockData);
      expect(mockApiClient.getOutgoingLetters).toHaveBeenCalled();
    });
  });

  describe('useNotifications', () => {
    it('should fetch notifications with auto-refresh', async () => {
      const mockData = {
        notifications: [
          { id: '1', title: 'Test Notification', message: 'Test message', isRead: false }
        ],
        pagination: { current: 1, limit: 10, total: 1, pages: 1 },
        unreadCount: 1
      };

      mockApiClient.getNotifications.mockResolvedValue(mockData);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockData);
      expect(mockApiClient.getNotifications).toHaveBeenCalled();
    });

    it('should handle unread only filter', async () => {
      const mockData = {
        notifications: [
          { id: '1', title: 'Unread Notification', message: 'Unread message', isRead: false }
        ],
        pagination: { current: 1, limit: 10, total: 1, pages: 1 },
        unreadCount: 1
      };

      mockApiClient.getNotifications.mockResolvedValue(mockData);

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useNotifications({ unreadOnly: true }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApiClient.getNotifications).toHaveBeenCalledWith({ unreadOnly: true });
    });
  });

  describe('useCalendarEvents', () => {
    it('should fetch calendar events', async () => {
      const mockData = {
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
      };

      mockApiClient.getCalendarEvents.mockResolvedValue(mockData);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useCalendarEvents(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockData);
      expect(mockApiClient.getCalendarEvents).toHaveBeenCalled();
    });

    it('should pass date range parameters', async () => {
      const mockData = { events: [] };
      mockApiClient.getCalendarEvents.mockResolvedValue(mockData);

      const wrapper = createWrapper();
      const params = { start: '2023-12-01', end: '2023-12-31' };
      const { result } = renderHook(() => useCalendarEvents(params), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApiClient.getCalendarEvents).toHaveBeenCalledWith(params);
    });
  });

  describe('useUpcomingEvents', () => {
    it('should fetch upcoming events with limit', async () => {
      const mockData = {
        events: [
          {
            id: '1',
            title: 'Upcoming Meeting',
            date: '2023-12-20T10:00:00Z',
            type: 'outgoing',
            letterNumber: 'OUT/001/2023'
          }
        ]
      };

      mockApiClient.getUpcomingEvents.mockResolvedValue(mockData);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpcomingEvents({ limit: 5 }), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockData);
      expect(mockApiClient.getUpcomingEvents).toHaveBeenCalledWith({ limit: 5 });
    });
  });
});