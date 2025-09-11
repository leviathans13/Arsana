import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const unreadOnly = req.query.unreadOnly === 'true';
    
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    // Get notifications for current user or global notifications
    where.OR = [
      { userId: req.user!.userId },
      { userId: null } // Global notifications
    ];
    
    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          ...where,
          isRead: false
        }
      })
    ]);

    res.json({
      notifications,
      pagination: {
        current: page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const markAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id }
    });

    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    // Check if user can mark this notification as read
    if (notification.userId && notification.userId !== req.user!.userId) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const markAllAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: {
        OR: [
          { userId: req.user!.userId },
          { userId: null }
        ],
        isRead: false
      },
      data: { isRead: true }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};