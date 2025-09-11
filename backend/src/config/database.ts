import { PrismaClient } from '@prisma/client';

// Global variable to store the Prisma client instance
let prisma: PrismaClient;

declare global {
  var __prisma: PrismaClient | undefined;
}

// Create a singleton Prisma client instance
export const getPrismaClient = (): PrismaClient => {
  if (process.env.NODE_ENV === 'production') {
    // In production, create a new instance each time
    return new PrismaClient({
      log: ['error', 'warn'],
      errorFormat: 'minimal',
    });
  } else {
    // In development, use global variable to prevent multiple instances
    if (!global.__prisma) {
      global.__prisma = new PrismaClient({
        log: ['query', 'info', 'warn', 'error'],
        errorFormat: 'pretty',
      });
    }
    return global.__prisma;
  }
};

// Initialize the Prisma client
prisma = getPrismaClient();

// Handle graceful shutdown
const gracefulShutdown = async () => {
  console.log('Disconnecting from database...');
  await prisma.$disconnect();
  console.log('Database disconnected');
};

// Register shutdown handlers
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('beforeExit', gracefulShutdown);

export default prisma;