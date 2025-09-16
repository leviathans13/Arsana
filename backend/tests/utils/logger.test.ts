import logger, { devLogger } from '../../src/utils/logger';

describe('Logger Utils', () => {
  describe('Logger Configuration', () => {
    it('should export main logger instance', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should export development logger instance', () => {
      expect(devLogger).toBeDefined();
      expect(typeof devLogger.info).toBe('function');
      expect(typeof devLogger.warn).toBe('function');
      expect(typeof devLogger.error).toBe('function');
      expect(typeof devLogger.debug).toBe('function');
    });
  });

  describe('Logging Methods', () => {
    it('should have all standard logging methods on main logger', () => {
      const methods = ['error', 'warn', 'info', 'debug'] as const;
      methods.forEach(method => {
        expect((logger as any)[method]).toBeDefined();
        expect(typeof (logger as any)[method]).toBe('function');
      });
    });

    it('should have all standard logging methods on dev logger', () => {
      const methods = ['error', 'warn', 'info', 'debug'] as const;
      methods.forEach(method => {
        expect((devLogger as any)[method]).toBeDefined();
        expect(typeof (devLogger as any)[method]).toBe('function');
      });
    });
  });

  describe('Logger Usage', () => {
    it('should not throw when logging messages', () => {
      expect(() => {
        logger.info('Test info message');
        logger.warn('Test warning message');
        logger.error('Test error message');
        logger.debug('Test debug message');
      }).not.toThrow();
    });

    it('should not throw when logging with metadata', () => {
      expect(() => {
        logger.info('Test message with metadata', { user: 'test', action: 'login' });
        logger.error('Test error with metadata', { error: 'Test error', stack: 'error stack' });
      }).not.toThrow();
    });

    it('should handle dev logger without throwing', () => {
      expect(() => {
        devLogger.info('Dev info message');
        devLogger.warn('Dev warning message');
        devLogger.error('Dev error message');
        devLogger.debug('Dev debug message');
      }).not.toThrow();
    });
  });

  describe('Logger Properties', () => {
    it('should have level property', () => {
      expect(logger.level).toBeDefined();
    });

    it('should be different instances for main and dev loggers', () => {
      expect(logger).not.toBe(devLogger);
    });
  });

  describe('Error Handling', () => {
    it('should handle undefined messages gracefully', () => {
      expect(() => {
        logger.info(undefined as any);
        logger.warn(undefined as any);
        logger.error(undefined as any);
      }).not.toThrow();
    });

    it('should handle null metadata gracefully', () => {
      expect(() => {
        logger.info('Test message', null as any);
        logger.error('Test error', null as any);
      }).not.toThrow();
    });

    it('should handle circular reference in metadata', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      expect(() => {
        logger.info('Test with circular reference', circular);
      }).not.toThrow();
    });
  });
});