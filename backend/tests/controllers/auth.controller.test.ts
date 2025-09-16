import { Request, Response } from 'express';

// Mock the auth controller module to allow proper mocking
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

const mockAuthUtils = {
  generateToken: jest.fn(),
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
};

// Mock the entire auth controller module 
jest.mock('../../src/controllers/auth.controller', () => {
  const originalModule = jest.requireActual('../../src/controllers/auth.controller');
  return {
    ...originalModule,
  };
});

// Mock the Prisma client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
}));

// Mock the auth utils
jest.mock('../../src/utils/auth', () => mockAuthUtils);

import { login, register } from '../../src/controllers/auth.controller';

describe('Auth Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock request and response
    mockRequest = {
      body: {}
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'password123'
    };

    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'STAFF',
      password: 'hashedPassword123'
    };

    it('should login successfully with valid credentials', async () => {
      mockRequest.body = validLoginData;
      
      // Mock database response
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      
      // Mock auth utils
      mockAuthUtils.comparePassword.mockResolvedValue(true);
      mockAuthUtils.generateToken.mockReturnValue('mock-jwt-token');

      await login(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: validLoginData.email }
      });
      expect(mockAuthUtils.comparePassword).toHaveBeenCalledWith(
        validLoginData.password,
        mockUser.password
      );
      expect(mockAuthUtils.generateToken).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        token: 'mock-jwt-token',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role
        }
      });
    });

    it('should return 401 for non-existent user', async () => {
      mockRequest.body = validLoginData;
      
      // Mock user not found
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid credentials'
      });
    });

    it('should return 401 for invalid password', async () => {
      mockRequest.body = validLoginData;
      
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockAuthUtils.comparePassword.mockResolvedValue(false);

      await login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid credentials'
      });
    });

    it('should return 400 for invalid input data', async () => {
      mockRequest.body = {
        email: 'invalid-email',
        password: ''
      };

      await login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid input data'
        })
      );
    });

    it('should handle missing email', async () => {
      mockRequest.body = {
        password: 'password123'
      };

      await login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should handle missing password', async () => {
      mockRequest.body = {
        email: 'test@example.com'
      };

      await login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should handle database errors', async () => {
      mockRequest.body = validLoginData;
      
      (mockPrisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

      await login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Internal server error'
      });
    });
  });

  describe('register', () => {
    const validRegisterData = {
      email: 'newuser@example.com',
      password: 'password123',
      name: 'New User',
      role: 'STAFF'
    };

    const mockCreatedUser = {
      id: 'user-new',
      email: 'newuser@example.com',
      name: 'New User',
      role: 'STAFF',
      password: 'hashedPassword123'
    };

    it('should register successfully with valid data', async () => {
      mockRequest.body = validRegisterData;
      
      // Mock user doesn't exist
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      // Mock password hashing
      mockAuthUtils.hashPassword.mockResolvedValue('hashedPassword123');
      // Mock user creation
      (mockPrisma.user.create as jest.Mock).mockResolvedValue(mockCreatedUser);
      // Mock token generation
      mockAuthUtils.generateToken.mockReturnValue('new-user-token');

      await register(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: validRegisterData.email }
      });
      expect(mockAuthUtils.hashPassword).toHaveBeenCalledWith(validRegisterData.password);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: validRegisterData.email,
          password: 'hashedPassword123',
          name: validRegisterData.name,
          role: validRegisterData.role
        }
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        token: 'new-user-token',
        user: {
          id: mockCreatedUser.id,
          email: mockCreatedUser.email,
          name: mockCreatedUser.name,
          role: mockCreatedUser.role
        }
      });
    });

    it('should use default role STAFF when not provided', async () => {
      const dataWithoutRole = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User'
      };
      
      mockRequest.body = dataWithoutRole;
      
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      mockAuthUtils.hashPassword.mockResolvedValue('hashedPassword123');
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        ...mockCreatedUser,
        role: 'STAFF'
      });
      mockAuthUtils.generateToken.mockReturnValue('new-user-token');

      await register(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: dataWithoutRole.email,
          password: 'hashedPassword123',
          name: dataWithoutRole.name,
          role: 'STAFF'
        }
      });
    });

    it('should return 400 for existing user', async () => {
      mockRequest.body = validRegisterData;
      
      // Mock existing user
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockCreatedUser);

      await register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'User already exists'
      });
    });

    it('should return 400 for invalid email format', async () => {
      mockRequest.body = {
        ...validRegisterData,
        email: 'invalid-email'
      };

      await register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid input data'
        })
      );
    });

    it('should return 400 for short password', async () => {
      mockRequest.body = {
        ...validRegisterData,
        password: '123'
      };

      await register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for missing name', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      await register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid role', async () => {
      mockRequest.body = {
        ...validRegisterData,
        role: 'INVALID_ROLE'
      };

      await register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should handle database errors during registration', async () => {
      mockRequest.body = validRegisterData;
      
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      mockAuthUtils.hashPassword.mockResolvedValue('hashedPassword123');
      (mockPrisma.user.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      await register(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Internal server error'
      });
    });
  });
});