import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import incomingLetterRoutes from './routes/incomingLetter.routes';
import outgoingLetterRoutes from './routes/outgoingLetter.routes';
import dispositionRoutes from './routes/disposition.routes';
import notificationRoutes from './routes/notification.routes';
import calendarRoutes from './routes/calendar.routes';
import fileRoutes from './routes/file.routes';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { requestLogger, detailedRequestLogger } from './middleware/requestLogger';

// Import services
import { startCronJobs } from './services/cronService';

// Import logging
import logger, { devLogger } from './utils/logger';

const app: Express = express();
const prisma = new PrismaClient();

// Create necessary directories
const logsDir = path.join(__dirname, '../logs');
const uploadsDir = path.join(__dirname, '../uploads');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  devLogger.info('Created logs directory');
}

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  devLogger.info('Created uploads directory');
}

// Request logging middleware (before other middleware)
const loggerMiddlewares = requestLogger();
loggerMiddlewares.forEach(middleware => app.use(middleware));

// Detailed request logging for debugging (if enabled)
app.use(detailedRequestLogger);

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      url: req.originalUrl
    });
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['http://localhost:3000'] // Add your frontend domain in production
    : ['http://localhost:3000'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    // Log large payloads in development
    if (process.env.NODE_ENV === 'development' && buf.length > 1024 * 1024) {
      devLogger.warn(`Large JSON payload: ${Math.round(buf.length / 1024)}KB`);
    }
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    // Log large payloads in development
    if (process.env.NODE_ENV === 'development' && buf.length > 1024 * 1024) {
      devLogger.warn(`Large form payload: ${Math.round(buf.length / 1024)}KB`);
    }
  }
}));

// Static files for uploaded documents with logging
app.use('/uploads', (req, res, next) => {
  devLogger.debug(`Static file request: ${req.path}`);
  next();
}, express.static(path.join(__dirname, '..', 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/incoming-letters', incomingLetterRoutes);
app.use('/api/outgoing-letters', outgoingLetterRoutes);
app.use('/api/dispositions', dispositionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/files', fileRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const healthData = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version
  };
  
  devLogger.info('Health check requested', healthData);
  res.json(healthData);
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start cron jobs
startCronJobs();
logger.info('Cron jobs started');

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully...`);
  
  try {
    await prisma.$disconnect();
    logger.info('Database connection closed');
    
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`📝 Logging level: ${process.env.NODE_ENV === 'production' ? 'info' : 'debug'}`);
  
  if (process.env.NODE_ENV === 'development') {
    devLogger.info('Development logging enabled');
    devLogger.info('File logging:', process.env.ENABLE_FILE_LOGGING === 'true' ? 'enabled' : 'disabled');
    devLogger.info('Detailed request logging:', process.env.DETAILED_REQUEST_LOGGING === 'true' ? 'enabled' : 'disabled');
  }
});

export default app;