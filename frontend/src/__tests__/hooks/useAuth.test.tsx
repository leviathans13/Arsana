/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, renderHook, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../hooks/useAuth';

// Mock dependencies
jest.mock('js-cookie', () => ({
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/api', () => ({
  default: {
    getCurrentUser: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
  },
}));

import Cookies from 'js-cookie';
import { toast } from 'react-hot-toast';
import apiClient from '@/lib/api';

const mockCookies = Cookies as jest.Mocked<typeof Cookies>;
const mockToast = toast as jest.Mocked<typeof toast>;
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCookies.get.mockReturnValue(undefined);
  });

  describe('Hook Usage', () => {
    it('should throw error when used outside AuthProvider', () => {
      const TestComponent = () => {
        useAuth();
        return null;
      };

      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => render(<TestComponent />)).toThrow(
        'useAuth must be used within an AuthProvider'
      );

      console.error = originalError;
    });

    it('should work correctly when used within AuthProvider', () => {
      const TestComponent = () => {
        const auth = useAuth();
        return <div data-testid="auth-status">{auth.loading ? 'loading' : 'loaded'}</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('auth-status')).toBeInTheDocument();
    });
  });

  describe('Initial State', () => {
    it('should start with loading state', () => {
      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should complete loading when no token exists', async () => {
      mockCookies.get.mockReturnValue(undefined);

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should verify existing token on initialization', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'STAFF' as const,
        createdAt: '2023-01-01T00:00:00Z'
      };

      mockCookies.get.mockReturnValue('existing-token');
      mockApiClient.getCurrentUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(mockApiClient.getCurrentUser).toHaveBeenCalled();
    });

    it('should handle token verification failure', async () => {
      mockCookies.get.mockReturnValue('invalid-token');
      mockApiClient.getCurrentUser.mockRejectedValue(new Error('Token invalid'));

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
      expect(mockCookies.remove).toHaveBeenCalledWith('authToken');
    });
  });

  describe('Login Function', () => {
    it('should login successfully', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' };
      const mockAuthResponse = {
        token: 'new-token',
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'STAFF' as const,
          createdAt: '2023-01-01T00:00:00Z'
        }
      };

      mockApiClient.login.mockResolvedValue(mockAuthResponse);

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.login(credentials);
      });

      expect(mockApiClient.login).toHaveBeenCalledWith(credentials);
      expect(mockCookies.set).toHaveBeenCalledWith('authToken', 'new-token', {
        expires: 7,
        secure: true,
        sameSite: 'strict'
      });
      expect(result.current.user).toEqual(mockAuthResponse.user);
      expect(result.current.isAuthenticated).toBe(true);
      expect(mockToast.success).toHaveBeenCalledWith('Login berhasil!');
    });

    it('should handle login failure', async () => {
      const credentials = { email: 'test@example.com', password: 'wrongpassword' };
      const error = {
        response: {
          data: { error: 'Invalid credentials' }
        }
      };

      mockApiClient.login.mockRejectedValue(error);

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.login(credentials);
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith('Invalid credentials');
    });

    it('should handle generic login error', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' };
      const error = new Error('Network error');

      mockApiClient.login.mockRejectedValue(error);

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.login(credentials);
        } catch (e) {
          // Expected to throw
        }
      });

      expect(mockToast.error).toHaveBeenCalledWith('Login gagal. Silakan coba lagi.');
    });
  });

  describe('Register Function', () => {
    it('should register successfully', async () => {
      const registerData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        role: 'STAFF'
      };

      const mockAuthResponse = {
        token: 'new-token',
        user: {
          id: '2',
          email: 'newuser@example.com',
          name: 'New User',
          role: 'STAFF' as const,
          createdAt: '2023-01-01T00:00:00Z'
        }
      };

      mockApiClient.register.mockResolvedValue(mockAuthResponse);

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.register(registerData);
      });

      expect(mockApiClient.register).toHaveBeenCalledWith(registerData);
      expect(mockCookies.set).toHaveBeenCalledWith('authToken', 'new-token', {
        expires: 7,
        secure: true,
        sameSite: 'strict'
      });
      expect(result.current.user).toEqual(mockAuthResponse.user);
      expect(result.current.isAuthenticated).toBe(true);
      expect(mockToast.success).toHaveBeenCalledWith('Registrasi berhasil!');
    });

    it('should handle register failure', async () => {
      const registerData = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Existing User'
      };

      const error = {
        response: {
          data: { error: 'User already exists' }
        }
      };

      mockApiClient.register.mockRejectedValue(error);

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.register(registerData);
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith('User already exists');
    });
  });

  describe('Logout Function', () => {
    it('should logout successfully', async () => {
      // First, set up a logged-in state
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'STAFF' as const,
        createdAt: '2023-01-01T00:00:00Z'
      };

      mockCookies.get.mockReturnValue('existing-token');
      mockApiClient.getCurrentUser.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      // Now logout
      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
      expect(mockCookies.remove).toHaveBeenCalledWith('authToken');
      expect(mockToast.success).toHaveBeenCalledWith('Logged out successfully');
    });

    it('should handle logout when not logged in', () => {
      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });

      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
      expect(mockCookies.remove).toHaveBeenCalledWith('authToken');
      expect(mockToast.success).toHaveBeenCalledWith('Logged out successfully');
    });
  });

  describe('Authentication State', () => {
    it('should update isAuthenticated based on user state', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });

      // Initially not authenticated
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
      });

      // After successful login
      const credentials = { email: 'test@example.com', password: 'password123' };
      const mockAuthResponse = {
        token: 'token',
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'STAFF' as const,
          createdAt: '2023-01-01T00:00:00Z'
        }
      };

      mockApiClient.login.mockResolvedValue(mockAuthResponse);

      await act(async () => {
        await result.current.login(credentials);
      });

      expect(result.current.isAuthenticated).toBe(true);

      // After logout
      act(() => {
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Cookie Configuration', () => {
    it('should set secure cookies in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const credentials = { email: 'test@example.com', password: 'password123' };
      const mockAuthResponse = {
        token: 'token',
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'STAFF' as const,
          createdAt: '2023-01-01T00:00:00Z'
        }
      };

      mockApiClient.login.mockResolvedValue(mockAuthResponse);

      const { result } = renderHook(() => useAuth(), { wrapper: TestWrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.login(credentials);
      });

      expect(mockCookies.set).toHaveBeenCalledWith('authToken', 'token', {
        expires: 7,
        secure: true,
        sameSite: 'strict'
      });

      process.env.NODE_ENV = originalEnv;
    });
  });
});