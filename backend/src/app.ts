import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';

// Import database
import prisma from './config/database';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import incomingLetterRoutes from './routes/incomingLetter.routes';
import outgoingLetterRoutes from './routes/outgoingLetter.routes';
import notificationRoutes from './routes/notification.routes';
import calendarRoutes from './routes/calendar.routes';

// Import middleware
import { errorHandler, handleError } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { 
  requestLogger, 
  performanceMonitor, 
  securityLogger, 
  errorLogger,
  healthCheck,
  getMetrics
} from './middleware/logging';
import { 
  rateLimitConfigs,
  getRateLimitStatus,
  resetRateLimit,
  getRateLimitAnalytics
} from './middleware/rateLimiting';

// Import services
import { startCronJobs } from './services/cronService';

// Import utilities
import { warmCache } from './utils/cache';
import { cleanupOrphanedFiles } from './utils/fileUpload';

// Import Swagger
import { setupSwagger } from './config/swagger';

const app = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Logging middleware
app.use(requestLogger);
app.use(performanceMonitor);
app.use(securityLogger);

// Rate limiting
app.use(rateLimitConfigs.general);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'http://localhost:3000']
    : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw body for webhook verification if needed
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploaded documents
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Setup Swagger documentation
setupSwagger(app);

// API Routes with specific rate limiting
app.use('/api/auth', rateLimitConfigs.auth, authRoutes);
app.use('/api/users', rateLimitConfigs.userSpecific, userRoutes);
app.use('/api/incoming-letters', rateLimitConfigs.userSpecific, incomingLetterRoutes);
app.use('/api/outgoing-letters', rateLimitConfigs.userSpecific, outgoingLetterRoutes);
app.use('/api/notifications', rateLimitConfigs.userSpecific, notificationRoutes);
app.use('/api/calendar', rateLimitConfigs.userSpecific, calendarRoutes);

// System endpoints
app.get('/api/health', healthCheck);
app.get('/api/metrics', getMetrics);
app.get('/api/rate-limit/status', getRateLimitStatus);
app.post('/api/rate-limit/reset', resetRateLimit);
app.get('/api/rate-limit/analytics', getRateLimitAnalytics);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorLogger);
app.use(errorHandler);

// Initialize application
const initializeApp = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Warm cache
    await warmCache(prisma);
    console.log('✅ Cache warmed successfully');

    // Start cron jobs
    startCronJobs();
    console.log('✅ Cron jobs started');

    // Cleanup orphaned files (run once on startup)
    const deletedFiles = await cleanupOrphanedFiles(prisma);
    if (deletedFiles > 0) {
      console.log(`🧹 Cleaned up ${deletedFiles} orphaned files`);
    }

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🔍 Health Check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  
  try {
    // Stop accepting new connections
    process.removeAllListeners(signal);
    
    // Close database connection
    await prisma.$disconnect();
    console.log('✅ Database disconnected');
    
    // Exit process
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Register shutdown handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Initialize the application
initializeApp();

export default app;