export type Role = 'ADMIN' | 'STAFF';

export type LetterCategory = 'GENERAL' | 'INVITATION' | 'OFFICIAL' | 'ANNOUNCEMENT';

export type NotificationType = 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role?: Role;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface IncomingLetter {
  id: string;
  letterNumber: string;
  subject: string;
  sender: string;
  receivedDate: string;
  category: LetterCategory;
  description?: string;
  fileName?: string;
  filePath?: string;
  isInvitation: boolean;
  eventDate?: string;
  eventLocation?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface OutgoingLetter {
  id: string;
  letterNumber: string;
  subject: string;
  recipient: string;
  sentDate: string;
  category: LetterCategory;
  description?: string;
  fileName?: string;
  filePath?: string;
  isInvitation: boolean;
  eventDate?: string;
  eventLocation?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateIncomingLetterRequest {
  letterNumber: string;
  subject: string;
  sender: string;
  receivedDate: string;
  category?: LetterCategory;
  description?: string;
  isInvitation?: boolean;
  eventDate?: string;
  eventLocation?: string;
  file?: File;
}

export interface CreateOutgoingLetterRequest {
  letterNumber: string;
  subject: string;
  recipient: string;
  sentDate: string;
  category?: LetterCategory;
  description?: string;
  isInvitation?: boolean;
  eventDate?: string;
  eventLocation?: string;
  file?: File;
}

export interface PaginationResponse<T> {
  letters: T[];
  pagination: {
    current: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationResponse {
  notifications: Notification[];
  pagination: {
    current: number;
    limit: number;
    total: number;
    pages: number;
  };
  unreadCount: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  location?: string;
  type: 'incoming' | 'outgoing';
  letterNumber: string;
  description?: string;
}

export interface CalendarResponse {
  events: CalendarEvent[];
}