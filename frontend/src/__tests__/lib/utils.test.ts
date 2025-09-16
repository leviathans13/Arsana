/**
 * @jest-environment jsdom
 */

import { cn, formatDate, formatDateTime, createFormData } from '../../lib/utils';

describe('Frontend Utils', () => {
  describe('cn (className utility)', () => {
    it('should merge class names correctly', () => {
      const result = cn('base-class', 'additional-class');
      expect(result).toContain('base-class');
      expect(result).toContain('additional-class');
    });

    it('should handle conditional classes', () => {
      const isActive = true;
      const isDisabled = false;
      
      const result = cn(
        'base-class',
        isActive && 'active-class',
        isDisabled && 'disabled-class'
      );
      
      expect(result).toContain('base-class');
      expect(result).toContain('active-class');
      expect(result).not.toContain('disabled-class');
    });

    it('should handle arrays of classes', () => {
      const result = cn(['class1', 'class2'], 'class3');
      expect(result).toContain('class1');
      expect(result).toContain('class2');
      expect(result).toContain('class3');
    });

    it('should handle undefined and null values', () => {
      const result = cn('base-class', undefined, null, 'valid-class');
      expect(result).toContain('base-class');
      expect(result).toContain('valid-class');
    });

    it('should handle empty input', () => {
      const result = cn();
      expect(result).toBe('');
    });
  });

  describe('formatDate', () => {
    it('should format Date object correctly in Indonesian locale', () => {
      const date = new Date('2023-12-25T10:30:00Z');
      const formatted = formatDate(date);
      
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
      expect(formatted).toContain('2023');
      expect(formatted).toMatch(/Desember|December/); // Could be either depending on system locale
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
      expect(formatted).toContain('1'); // Day should be present
    });

    it('should format current date', () => {
      const now = new Date();
      const formatted = formatDate(now);
      const currentYear = now.getFullYear();
      
      expect(formatted).toContain(currentYear.toString());
    });

    it('should handle edge dates', () => {
      // Test leap year
      const leapYearDate = new Date('2024-02-29T00:00:00Z');
      const formatted = formatDate(leapYearDate);
      
      expect(formatted).toContain('2024');
      expect(formatted).toContain('29');
    });
  });

  describe('formatDateTime', () => {
    it('should format Date object with time correctly', () => {
      const date = new Date('2023-12-25T15:30:45Z');
      const formatted = formatDateTime(date);
      
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
      expect(formatted).toContain('2023');
      expect(formatted).toMatch(/\d{1,2}[.:]?\d{2}|\d{1,2}\s?(AM|PM)/i); // Should contain time in various formats
    });

    it('should format date string with time correctly', () => {
      const dateString = '2023-06-15T09:15:00Z';
      const formatted = formatDateTime(dateString);
      
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
      expect(formatted).toContain('2023');
      expect(formatted).toMatch(/\d{1,2}[.:]?\d{2}|\d{1,2}\s?(AM|PM)/i);
    });

    it('should include both date and time components', () => {
      const date = new Date('2023-07-04T14:30:00Z');
      const formatted = formatDateTime(date);
      
      // Should contain year (date component)
      expect(formatted).toContain('2023');
      // Should contain time component in various formats
      expect(formatted).toMatch(/\d{1,2}[.:]?\d{2}|\d{1,2}\s?(AM|PM)/i);
    });

    it('should handle midnight correctly', () => {
      const midnight = new Date('2023-12-31T00:00:00Z');
      const formatted = formatDateTime(midnight);
      
      expect(formatted).toContain('2023');
      expect(formatted).toMatch(/00[.:]?00|12[.:]?00|\bmidnight\b/i); // Could be 24h or 12h format or text
    });

    it('should handle noon correctly', () => {
      const noon = new Date('2023-06-15T12:00:00Z');
      const formatted = formatDateTime(noon);
      
      expect(formatted).toContain('2023');
      expect(formatted).toMatch(/12[.:]?00|\bnoon\b/i);
    });
  });

  describe('createFormData', () => {
    it('should create FormData from simple object', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30
      };

      const formData = createFormData(data);
      
      expect(formData).toBeInstanceOf(FormData);
      expect(formData.get('name')).toBe('John Doe');
      expect(formData.get('email')).toBe('john@example.com');
      expect(formData.get('age')).toBe('30');
    });

    it('should handle File objects correctly', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const data = {
        document: file,
        title: 'Test Document'
      };

      const formData = createFormData(data);
      
      expect(formData.get('document')).toBe(file);
      expect(formData.get('title')).toBe('Test Document');
    });

    it('should handle boolean values', () => {
      const data = {
        isActive: true,
        isPublic: false
      };

      const formData = createFormData(data);
      
      expect(formData.get('isActive')).toBe('true');
      expect(formData.get('isPublic')).toBe('false');
    });

    it('should skip null and undefined values', () => {
      const data = {
        name: 'John',
        nullValue: null,
        undefinedValue: undefined,
        email: 'john@example.com'
      };

      const formData = createFormData(data);
      
      expect(formData.get('name')).toBe('John');
      expect(formData.get('email')).toBe('john@example.com');
      expect(formData.get('nullValue')).toBeNull();
      expect(formData.get('undefinedValue')).toBeNull();
    });

    it('should handle arrays by converting to string', () => {
      const data = {
        tags: ['tag1', 'tag2', 'tag3'],
        numbers: [1, 2, 3]
      };

      const formData = createFormData(data);
      
      expect(formData.get('tags')).toBe('tag1,tag2,tag3');
      expect(formData.get('numbers')).toBe('1,2,3');
    });

    it('should handle objects by converting to string', () => {
      const data = {
        user: { id: 1, name: 'John' },
        settings: { theme: 'dark', language: 'en' }
      };

      const formData = createFormData(data);
      
      expect(formData.get('user')).toBe('[object Object]');
      expect(formData.get('settings')).toBe('[object Object]');
    });

    it('should handle empty object', () => {
      const data = {};
      const formData = createFormData(data);
      
      expect(formData).toBeInstanceOf(FormData);
      // Should be empty
      expect([...formData.keys()]).toHaveLength(0);
    });

    it('should handle mixed data types', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const data = {
        id: 123,
        title: 'Mixed Data Test',
        isImportant: true,
        file: file,
        nullField: null,
        tags: ['test', 'mixed'],
        metadata: { version: 1 }
      };

      const formData = createFormData(data);
      
      expect(formData.get('id')).toBe('123');
      expect(formData.get('title')).toBe('Mixed Data Test');
      expect(formData.get('isImportant')).toBe('true');
      expect(formData.get('file')).toBe(file);
      expect(formData.get('nullField')).toBeNull();
      expect(formData.get('tags')).toBe('test,mixed');
      expect(formData.get('metadata')).toBe('[object Object]');
    });

    it('should handle special characters in values', () => {
      const data = {
        message: 'Hello, World! @#$%^&*()',
        unicode: 'café ñoño 中文',
        newlines: 'Line 1\\nLine 2\\nLine 3'
      };

      const formData = createFormData(data);
      
      expect(formData.get('message')).toBe('Hello, World! @#$%^&*()');
      expect(formData.get('unicode')).toBe('café ñoño 中文');
      expect(formData.get('newlines')).toBe('Line 1\\nLine 2\\nLine 3');
    });
  });

  describe('Integration tests', () => {
    it('should work together in common use case', () => {
      // Simulate a form submission scenario
      const currentDate = new Date('2023-12-15T10:30:00Z');
      
      // Format dates for display
      const displayDate = formatDate(currentDate);
      const displayDateTime = formatDateTime(currentDate);
      
      // Create form data
      const formData = createFormData({
        title: 'Integration Test',
        createdAt: displayDateTime,
        isPublished: true
      });
      
      // Combine classes for styling
      const className = cn(
        'form-container',
        'bg-white',
        true && 'shadow-md',
        false && 'border-red-500'
      );
      
      expect(displayDate).toContain('2023');
      expect(displayDateTime).toMatch(/\d{1,2}[.:]?\d{2}|\d{1,2}\s?(AM|PM)/i);
      expect(formData.get('title')).toBe('Integration Test');
      expect(formData.get('isPublished')).toBe('true');
      expect(className).toContain('form-container');
      expect(className).toContain('shadow-md');
      expect(className).not.toContain('border-red-500');
    });
  });
});