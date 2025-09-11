import axios, { AxiosInstance } from 'axios';
import Cookies from 'js-cookie';
import { toast } from 'react-hot-toast';

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = Cookies.get('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const message = error.response?.data?.error || error.message || 'An error occurred';
        
        if (error.response?.status === 401) {
          // Unauthorized - remove token and redirect to login
          Cookies.remove('authToken');
          window.location.href = '/auth/login';
          return Promise.reject(error);
        }

        if (error.response?.status >= 500) {
          toast.error('Server error. Please try again later.');
        }

        return Promise.reject(error);
      }
    );
  }

  // Auth methods
  async login(credentials: { email: string; password: string }) {
    const response = await this.client.post('/auth/login', credentials);
    return response.data;
  }

  async register(data: { email: string; password: string; name: string; role?: string }) {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  // User methods
  async getCurrentUser() {
    const response = await this.client.get('/users/me');
    return response.data;
  }

  async getUsers() {
    const response = await this.client.get('/users');
    return response.data;
  }

  // Incoming Letters methods
  async getIncomingLetters(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
  }) {
    const response = await this.client.get('/incoming-letters', { params });
    return response.data;
  }

  async getIncomingLetterById(id: string) {
    const response = await this.client.get(`/incoming-letters/${id}`);
    return response.data;
  }

  async createIncomingLetter(data: FormData) {
    const response = await this.client.post('/incoming-letters', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async updateIncomingLetter(id: string, data: FormData) {
    const response = await this.client.put(`/incoming-letters/${id}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async deleteIncomingLetter(id: string) {
    const response = await this.client.delete(`/incoming-letters/${id}`);
    return response.data;
  }

  // Outgoing Letters methods
  async getOutgoingLetters(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
  }) {
    const response = await this.client.get('/outgoing-letters', { params });
    return response.data;
  }

  async getOutgoingLetterById(id: string) {
    const response = await this.client.get(`/outgoing-letters/${id}`);
    return response.data;
  }

  async createOutgoingLetter(data: FormData) {
    const response = await this.client.post('/outgoing-letters', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async updateOutgoingLetter(id: string, data: FormData) {
    const response = await this.client.put(`/outgoing-letters/${id}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async deleteOutgoingLetter(id: string) {
    const response = await this.client.delete(`/outgoing-letters/${id}`);
    return response.data;
  }

  // Notifications methods
  async getNotifications(params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }) {
    const response = await this.client.get('/notifications', { params });
    return response.data;
  }

  async markNotificationAsRead(id: string) {
    const response = await this.client.put(`/notifications/${id}/read`);
    return response.data;
  }

  async markAllNotificationsAsRead() {
    const response = await this.client.put('/notifications/read-all');
    return response.data;
  }

  // Calendar methods
  async getCalendarEvents(params?: { start?: string; end?: string }) {
    const response = await this.client.get('/calendar/events', { params });
    return response.data;
  }

  async getUpcomingEvents(params?: { limit?: number }) {
    const response = await this.client.get('/calendar/upcoming', { params });
    return response.data;
  }

  // Health check
  async healthCheck() {
    const response = await this.client.get('/health');
    return response.data;
  }
}

export const apiClient = new ApiClient();
export default apiClient;