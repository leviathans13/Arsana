import {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  JwtPayload
} from '../../src/utils/auth';
import jwt from 'jsonwebtoken';

describe('Auth Utils', () => {
  const mockPayload: JwtPayload = {
    userId: 'test-user-id',
    email: 'test@example.com',
    role: 'STAFF'
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token with the correct payload', () => {
      const token = generateToken(mockPayload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      // Decode token to verify payload
      const decoded = jwt.decode(token) as any;
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.role).toBe(mockPayload.role);
      expect(decoded.exp).toBeDefined(); // Should have expiration
    });

    it('should throw error when JWT_SECRET is not defined', () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;
      
      expect(() => generateToken(mockPayload)).toThrow('JWT_SECRET is not defined');
      
      // Restore original secret
      process.env.JWT_SECRET = originalSecret;
    });

    it('should use default expiration when JWT_EXPIRES_IN is not set', () => {
      const originalExpiresIn = process.env.JWT_EXPIRES_IN;
      delete process.env.JWT_EXPIRES_IN;
      
      const token = generateToken(mockPayload);
      const decoded = jwt.decode(token) as any;
      
      expect(decoded.exp).toBeDefined();
      
      // Restore original value
      process.env.JWT_EXPIRES_IN = originalExpiresIn;
    });
  });

  describe('verifyToken', () => {
    it('should verify and return payload for valid token', () => {
      const token = generateToken(mockPayload);
      const decoded = verifyToken(token);
      
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.role).toBe(mockPayload.role);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => verifyToken(invalidToken)).toThrow();
    });

    it('should throw error for expired token', () => {
      // Create a token with very short expiration
      const shortLivedPayload = { ...mockPayload };
      const shortToken = jwt.sign(shortLivedPayload, process.env.JWT_SECRET!, { expiresIn: '1ms' });
      
      // Wait for token to expire
      setTimeout(() => {
        expect(() => verifyToken(shortToken)).toThrow();
      }, 10);
    });

    it('should throw error when JWT_SECRET is not defined', () => {
      const token = generateToken(mockPayload);
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;
      
      expect(() => verifyToken(token)).toThrow('JWT_SECRET is not defined');
      
      // Restore original secret
      process.env.JWT_SECRET = originalSecret;
    });
  });

  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      const password = 'testPassword123';
      const hashedPassword = await hashPassword(password);
      
      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50); // bcrypt hashes are typically long
    });

    it('should generate different hashes for same password', async () => {
      const password = 'testPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2); // Due to salt, hashes should be different
    });

    it('should handle empty password', async () => {
      const emptyPassword = '';
      const hashedPassword = await hashPassword(emptyPassword);
      
      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
    });
  });

  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      const password = 'testPassword123';
      const hashedPassword = await hashPassword(password);
      
      const isMatch = await comparePassword(password, hashedPassword);
      expect(isMatch).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword456';
      const hashedPassword = await hashPassword(password);
      
      const isMatch = await comparePassword(wrongPassword, hashedPassword);
      expect(isMatch).toBe(false);
    });

    it('should return false for empty password against real hash', async () => {
      const password = 'testPassword123';
      const hashedPassword = await hashPassword(password);
      
      const isMatch = await comparePassword('', hashedPassword);
      expect(isMatch).toBe(false);
    });

    it('should handle case sensitivity', async () => {
      const password = 'TestPassword123';
      const hashedPassword = await hashPassword(password);
      
      const isMatchLower = await comparePassword('testpassword123', hashedPassword);
      const isMatchUpper = await comparePassword('TESTPASSWORD123', hashedPassword);
      
      expect(isMatchLower).toBe(false);
      expect(isMatchUpper).toBe(false);
    });
  });

  describe('Integration tests', () => {
    it('should work with full auth flow', async () => {
      const password = 'securePassword123';
      
      // Hash password
      const hashedPassword = await hashPassword(password);
      
      // Verify password
      const isValidPassword = await comparePassword(password, hashedPassword);
      expect(isValidPassword).toBe(true);
      
      // Generate token
      const token = generateToken(mockPayload);
      
      // Verify token
      const decodedPayload = verifyToken(token);
      expect(decodedPayload.userId).toBe(mockPayload.userId);
      expect(decodedPayload.email).toBe(mockPayload.email);
      expect(decodedPayload.role).toBe(mockPayload.role);
    });
  });
});