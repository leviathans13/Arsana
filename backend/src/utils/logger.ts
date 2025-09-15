import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');

// Define log levels and colors
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(logColors);

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
);

// Define file format (without colors for files)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Create transports array
const transports: winston.transport[] = [];

// Console transport (always enabled in development)
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: logFormat,
      level: 'debug'
    })
  );
}

// File transports for production and development
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_FILE_LOGGING === 'true') {
  // Error logs
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format: fileFormat,
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true
    })
  );

  // Combined logs
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format: fileFormat,
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true
    })
  );

  // HTTP request logs
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'http-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'http',
      format: fileFormat,
      maxSize: '20m',
      maxFiles: '7d',
      zippedArchive: true
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  levels: logLevels,
  format: fileFormat,
  transports,
  exitOnError: false,
});

// Development-specific logging
export const devLogger = {
  debug: (message: string, meta?: any) => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug(message, meta);
    }
  },
  info: (message: string, meta?: any) => {
    if (process.env.NODE_ENV === 'development') {
      logger.info(message, meta);
    }
  },
  warn: (message: string, meta?: any) => {
    if (process.env.NODE_ENV === 'development') {
      logger.warn(message, meta);
    }
  },
  error: (message: string, meta?: any) => {
    if (process.env.NODE_ENV === 'development') {
      logger.error(message, meta);
    }
  }
};

// HTTP request logger helper
export const httpLogger = {
  request: (method: string, url: string, ip: string, userAgent?: string) => {
    logger.http(`${method} ${url} - ${ip} - ${userAgent || 'Unknown'}`);
  },
  response: (method: string, url: string, statusCode: number, responseTime: number) => {
    const level = statusCode >= 400 ? 'error' : 'http';
    logger.log(level, `${method} ${url} - ${statusCode} - ${responseTime}ms`);
  }
};

// Security logger for authentication and authorization events
export const securityLogger = {
  loginAttempt: (email: string, ip: string, success: boolean) => {
    logger.info(`Login attempt for ${email} from ${ip} - ${success ? 'SUCCESS' : 'FAILED'}`);
  },
  tokenExpired: (userId: string, ip: string) => {
    logger.warn(`Token expired for user ${userId} from ${ip}`);
  },
  unauthorizedAccess: (ip: string, path: string, userId?: string) => {
    logger.warn(`Unauthorized access attempt to ${path} from ${ip}${userId ? ` (User: ${userId})` : ''}`);
  },
  fileAccess: (userId: string, fileName: string, action: 'download' | 'upload' | 'delete') => {
    logger.info(`File ${action}: ${fileName} by user ${userId}`);
  }
};

export default logger;