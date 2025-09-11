import { PrismaClient } from '@prisma/client';
import { AppError, DatabaseError } from './errors';

export interface TransactionOptions {
  timeout?: number; // Transaction timeout in milliseconds
  isolationLevel?: 'ReadUncommitted' | 'ReadCommitted' | 'RepeatableRead' | 'Serializable';
}

export class TransactionManager {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // Execute a transaction with automatic rollback on error
  async execute<T>(
    callback: (tx: PrismaClient) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    const { timeout = 30000, isolationLevel = 'ReadCommitted' } = options;

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // Set transaction timeout if supported
          if (timeout < 30000) {
            await tx.$executeRaw`SET LOCAL statement_timeout = ${timeout}`;
          }

          return await callback(tx);
        },
        {
          timeout,
          isolationLevel: isolationLevel as any,
        }
      );
    } catch (error) {
      console.error('Transaction failed:', error);
      throw new DatabaseError(`Transaction failed: ${(error as Error).message}`);
    }
  }

  // Execute multiple operations in a single transaction
  async executeBatch<T>(
    operations: Array<(tx: PrismaClient) => Promise<T>>,
    options: TransactionOptions = {}
  ): Promise<T[]> {
    return this.execute(async (tx) => {
      const results: T[] = [];
      for (const operation of operations) {
        const result = await operation(tx);
        results.push(result);
      }
      return results;
    }, options);
  }

  // Retry transaction on deadlock
  async executeWithRetry<T>(
    callback: (tx: PrismaClient) => Promise<T>,
    maxRetries: number = 3,
    options: TransactionOptions = {}
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.execute(callback, options);
      } catch (error) {
        lastError = error as Error;
        
        // Check if it's a deadlock error (PostgreSQL specific)
        if (this.isDeadlockError(error) && attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff
          console.warn(`Transaction deadlock detected, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
          await this.sleep(delay);
          continue;
        }
        
        throw error;
      }
    }

    throw lastError!;
  }

  private isDeadlockError(error: any): boolean {
    return error?.code === '40P01' || // PostgreSQL deadlock detected
           error?.message?.includes('deadlock') ||
           error?.message?.includes('Deadlock');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Common transaction patterns
export class TransactionPatterns {
  private transactionManager: TransactionManager;

  constructor(prisma: PrismaClient) {
    this.transactionManager = new TransactionManager(prisma);
  }

  // Create letter with file upload
  async createLetterWithFile<T extends 'incoming' | 'outgoing'>(
    letterData: any,
    fileData: { fileName: string; filePath: string } | null,
    userId: string,
    type: T
  ): Promise<any> {
    return this.transactionManager.execute(async (tx) => {
      // Create the letter
      const letter = await tx[`${type}Letter`].create({
        data: {
          ...letterData,
          userId,
          fileName: fileData?.fileName || null,
          filePath: fileData?.filePath || null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Create notification for the user
      await tx.notification.create({
        data: {
          title: `${type === 'incoming' ? 'Incoming' : 'Outgoing'} Letter Created`,
          message: `A new ${type} letter "${letter.subject}" has been created.`,
          type: 'INFO',
          userId,
        },
      });

      return letter;
    });
  }

  // Update letter with file replacement
  async updateLetterWithFile<T extends 'incoming' | 'outgoing'>(
    letterId: string,
    updateData: any,
    newFileData: { fileName: string; filePath: string } | null,
    userId: string,
    type: T
  ): Promise<any> {
    return this.transactionManager.execute(async (tx) => {
      // Get existing letter
      const existingLetter = await tx[`${type}Letter`].findUnique({
        where: { id: letterId },
      });

      if (!existingLetter) {
        throw new AppError(`${type === 'incoming' ? 'Incoming' : 'Outgoing'} letter not found`, 404);
      }

      // Check permissions
      if (existingLetter.userId !== userId) {
        throw new AppError('Unauthorized to update this letter', 403);
      }

      // Prepare update data
      const updatePayload: any = { ...updateData };
      if (newFileData) {
        updatePayload.fileName = newFileData.fileName;
        updatePayload.filePath = newFileData.filePath;
      }

      // Update the letter
      const updatedLetter = await tx[`${type}Letter`].update({
        where: { id: letterId },
        data: updatePayload,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Create notification
      await tx.notification.create({
        data: {
          title: `${type === 'incoming' ? 'Incoming' : 'Outgoing'} Letter Updated`,
          message: `The ${type} letter "${updatedLetter.subject}" has been updated.`,
          type: 'INFO',
          userId,
        },
      });

      return {
        letter: updatedLetter,
        oldFilePath: existingLetter.filePath,
      };
    });
  }

  // Delete letter with file cleanup
  async deleteLetterWithFile<T extends 'incoming' | 'outgoing'>(
    letterId: string,
    userId: string,
    type: T
  ): Promise<{ filePath: string | null }> {
    return this.transactionManager.execute(async (tx) => {
      // Get existing letter
      const existingLetter = await tx[`${type}Letter`].findUnique({
        where: { id: letterId },
      });

      if (!existingLetter) {
        throw new AppError(`${type === 'incoming' ? 'Incoming' : 'Outgoing'} letter not found`, 404);
      }

      // Check permissions
      if (existingLetter.userId !== userId) {
        throw new AppError('Unauthorized to delete this letter', 403);
      }

      // Delete the letter
      await tx[`${type}Letter`].delete({
        where: { id: letterId },
      });

      // Create notification
      await tx.notification.create({
        data: {
          title: `${type === 'incoming' ? 'Incoming' : 'Outgoing'} Letter Deleted`,
          message: `The ${type} letter "${existingLetter.subject}" has been deleted.`,
          type: 'WARNING',
          userId,
        },
      });

      return { filePath: existingLetter.filePath };
    });
  }

  // Bulk operations
  async bulkCreateLetters<T extends 'incoming' | 'outgoing'>(
    lettersData: Array<any>,
    userId: string,
    type: T
  ): Promise<any[]> {
    return this.transactionManager.execute(async (tx) => {
      const letters = await Promise.all(
        lettersData.map(data =>
          tx[`${type}Letter`].create({
            data: {
              ...data,
              userId,
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          })
        )
      );

      // Create bulk notification
      await tx.notification.create({
        data: {
          title: `Bulk ${type === 'incoming' ? 'Incoming' : 'Outgoing'} Letters Created`,
          message: `${letters.length} ${type} letters have been created.`,
          type: 'SUCCESS',
          userId,
        },
      });

      return letters;
    });
  }

  // User management operations
  async createUserWithProfile(userData: any): Promise<any> {
    return this.transactionManager.execute(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: userData,
      });

      // Create welcome notification
      await tx.notification.create({
        data: {
          title: 'Welcome to Arsana',
          message: 'Your account has been created successfully. Welcome to the digital document archive system.',
          type: 'SUCCESS',
          userId: user.id,
        },
      });

      return user;
    });
  }

  // Cleanup operations
  async cleanupExpiredData(): Promise<{ deletedCount: number }> {
    return this.transactionManager.execute(async (tx) => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Delete old read notifications
      const deletedNotifications = await tx.notification.deleteMany({
        where: {
          isRead: true,
          createdAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      return { deletedCount: deletedNotifications.count };
    });
  }
}

// Export transaction utilities
export const createTransactionManager = (prisma: PrismaClient) => {
  return new TransactionManager(prisma);
};

export const createTransactionPatterns = (prisma: PrismaClient) => {
  return new TransactionPatterns(prisma);
};