// =======================
// 📌 Union Types
// =======================
export type Role = 'ADMIN' | 'STAFF';
export type LetterCategory = 'GENERAL' | 'INVITATION' | 'OFFICIAL' | 'ANNOUNCEMENT';
export type NotificationType = 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';

// =======================
// 📌 User Types
// =======================
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string; // ISO date string
}

// Mini version for embedded relations
export type UserMini = Pick<User, 'id' | 'name' | 'email'>;

// =======================
// 📌 Auth Types
// =======================
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

// =======================
// 📌 Letter Types
// =======================
export interface IncomingLetter {
  id: string;
  letterNumber: string;
  subject: string;
  sender: string;
  receivedDate: string; // ISO date string
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
  user: UserMini;
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
  user: UserMini;
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
  file?: File | Blob;
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
  file?: File | Blob;
}

// =======================
// 📌 Pagination
// =======================
export interface Pagination {
  current: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginationResponse<T> {
  letters: T[];
  pagination: Pagination;
}

// =======================
// 📌 Notification
// =======================
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
  pagination: Pagination;
  unreadCount: number;
}

// =======================
// 📌 Calendar
// =======================
export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date string
  location?: string;
  type: 'incoming' | 'outgoing';
  letterNumber: string;
  description?: string;
}

export interface CalendarResponse {
  events: CalendarEvent[];
}
