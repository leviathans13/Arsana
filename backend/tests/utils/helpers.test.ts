import {
  formatDate,
  isValidEmail,
  sanitizeString,
  generateLetterNumber
} from '../../src/utils/helpers';

describe('Helper Utils', () => {
  describe('formatDate', () => {
    it('should format Date object correctly in Indonesian locale', () => {
      const date = new Date('2023-12-25T10:30:00Z');
      const formatted = formatDate(date);
      
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
      expect(formatted).toContain('2023');
      expect(formatted).toMatch(/Desember|December/); // Indonesian month name
    });

    it('should format date string correctly', () => {
      const dateString = '2023-06-15T14:20:00Z';
      const formatted = formatDate(dateString);
      
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
      expect(formatted).toContain('2023');
      expect(formatted).toMatch(/Juni|June/);
    });

    it('should handle ISO date strings', () => {
      const isoDate = '2023-01-01T00:00:00.000Z';
      const formatted = formatDate(isoDate);
      
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
      expect(formatted).toContain('2023');
    });

    it('should include time information', () => {
      const date = new Date('2023-07-04T15:45:30Z');
      const formatted = formatDate(date);
      
      expect(formatted).toBeDefined();
      // Should contain time information (hour and minute) - could be various formats
      expect(formatted).toMatch(/\d{1,2}[.:]?\d{2}|\d{1,2}\s?(AM|PM)/i);
    });

    it('should handle invalid date gracefully', () => {
      const invalidDate = 'invalid-date-string';
      
      expect(() => formatDate(invalidDate)).not.toThrow();
      const result = formatDate(invalidDate);
      expect(result).toMatch(/Invalid Date|NaN/);
    });
  });

  describe('isValidEmail', () => {
    it('should return true for valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.id',
        'admin+tag@company.org',
        'jane.doe123@university.edu',
        'contact@sub.domain.com'
      ];

      validEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(true);
      });
    });

    it('should return false for invalid email addresses', () => {
      const invalidEmails = [
        '',
        'invalid',
        'test@',
        '@domain.com',
        'test..test@domain.com',
        'test@domain',
        'test@.com',
        'test@domain.',
        'test space@domain.com',
        'test@domain .com',
        'test@domain..com',
        'test@domain.c' // TLD too short
      ];

      invalidEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(false);
      });
    });

    it('should handle edge cases', () => {
      expect(isValidEmail('a@b.co')).toBe(true); // Minimum valid email
      expect(isValidEmail('very.long.email.address@very.long.domain.name.com')).toBe(true);
      expect(isValidEmail('test+123@domain-name.co.id')).toBe(true);
    });
  });

  describe('sanitizeString', () => {
    it('should trim whitespace from beginning and end', () => {
      const input = '  hello world  ';
      const result = sanitizeString(input);
      
      expect(result).toBe('hello world');
    });

    it('should replace multiple spaces with single space', () => {
      const input = 'hello    world    test';
      const result = sanitizeString(input);
      
      expect(result).toBe('hello world test');
    });

    it('should handle mixed whitespace characters', () => {
      const input = 'hello\t\tworld\n\ntest';
      const result = sanitizeString(input);
      
      expect(result).toBe('hello world test');
    });

    it('should handle empty string', () => {
      const input = '';
      const result = sanitizeString(input);
      
      expect(result).toBe('');
    });

    it('should handle string with only spaces', () => {
      const input = '     ';
      const result = sanitizeString(input);
      
      expect(result).toBe('');
    });

    it('should handle already clean string', () => {
      const input = 'hello world';
      const result = sanitizeString(input);
      
      expect(result).toBe('hello world');
    });

    it('should handle special characters', () => {
      const input = '  hello @#$% world  ';
      const result = sanitizeString(input);
      
      expect(result).toBe('hello @#$% world');
    });
  });

  describe('generateLetterNumber', () => {
    it('should generate letter number with default prefix and current year', () => {
      const letterNumber = generateLetterNumber();
      const currentYear = new Date().getFullYear();
      
      expect(letterNumber).toBeDefined();
      expect(typeof letterNumber).toBe('string');
      expect(letterNumber).toContain('SR'); // Default prefix
      expect(letterNumber).toContain(currentYear.toString());
      expect(letterNumber).toMatch(/^SR\/\d{4}\/\d{4}$/); // Format: SR/XXXX/YYYY
    });

    it('should generate letter number with custom prefix', () => {
      const customPrefix = 'OUT';
      const letterNumber = generateLetterNumber(customPrefix);
      const currentYear = new Date().getFullYear();
      
      expect(letterNumber).toContain(customPrefix);
      expect(letterNumber).toContain(currentYear.toString());
      expect(letterNumber).toMatch(/^OUT\/\d{4}\/\d{4}$/);
    });

    it('should generate letter number with custom year', () => {
      const customYear = 2022;
      const letterNumber = generateLetterNumber('IN', customYear);
      
      expect(letterNumber).toContain('IN');
      expect(letterNumber).toContain('2022');
      expect(letterNumber).toMatch(/^IN\/\d{4}\/2022$/);
    });

    it('should generate different numbers on multiple calls', () => {
      const number1 = generateLetterNumber();
      const number2 = generateLetterNumber();
      
      expect(number1).not.toBe(number2);
    });

    it('should generate 4-digit random number between 1000-9999', () => {
      // Generate multiple letter numbers and check the random part
      for (let i = 0; i < 10; i++) {
        const letterNumber = generateLetterNumber('TEST', 2023);
        const parts = letterNumber.split('/');
        const randomPart = parseInt(parts[1]);
        
        expect(randomPart).toBeGreaterThanOrEqual(1000);
        expect(randomPart).toBeLessThanOrEqual(9999);
      }
    });

    it('should handle empty prefix', () => {
      const letterNumber = generateLetterNumber('');
      
      expect(letterNumber).toBeDefined();
      expect(letterNumber).toMatch(/^\/\d{4}\/\d{4}$/);
    });

    it('should handle special characters in prefix', () => {
      const letterNumber = generateLetterNumber('ABC-123');
      
      expect(letterNumber).toContain('ABC-123');
      expect(letterNumber).toMatch(/^ABC-123\/\d{4}\/\d{4}$/);
    });
  });

  describe('Integration tests', () => {
    it('should work with combined helper functions', () => {
      // Test scenario: Processing form data
      const userInput = {
        email: '  admin@company.com  ',
        subject: '  Important   Document   Request  ',
        description: '\t\tPlease process this request\n\n\n'
      };

      // Sanitize and validate
      const cleanEmail = sanitizeString(userInput.email);
      const cleanSubject = sanitizeString(userInput.subject);
      const cleanDescription = sanitizeString(userInput.description);
      
      expect(isValidEmail(cleanEmail)).toBe(true);
      expect(cleanSubject).toBe('Important Document Request');
      expect(cleanDescription).toBe('Please process this request');
      
      // Generate letter number for this request
      const letterNumber = generateLetterNumber('REQ');
      expect(letterNumber).toMatch(/^REQ\/\d{4}\/\d{4}$/);
      
      // Format current date for timestamp
      const now = new Date();
      const formattedDate = formatDate(now);
      expect(formattedDate).toBeDefined();
    });
  });
});