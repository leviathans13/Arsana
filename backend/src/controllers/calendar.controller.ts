import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  location?: string;
  type: 'incoming' | 'outgoing';
  letterNumber: string;
  description?: string;
}

export const getCalendarEvents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const startDate = req.query.start ? new Date(req.query.start as string) : new Date();
    const endDate = req.query.end ? new Date(req.query.end as string) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    // Get incoming letter invitations
    const incomingInvitations = await prisma.incomingLetter.findMany({
      where: {
        isInvitation: true,
        eventDate: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        id: true,
        subject: true,
        eventDate: true,
        eventLocation: true,
        letterNumber: true,
        
      }
    });

    // Get outgoing letter invitations
    const outgoingInvitations = await prisma.outgoingLetter.findMany({
      where: {
        isInvitation: true,
        eventDate: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        id: true,
        subject: true,
        eventDate: true,
        eventLocation: true,
        letterNumber: true,
        
      }
    });

    // Format events
    const events: CalendarEvent[] = [
      ...incomingInvitations.map((letter: any) => ({
        id: letter.id,
        title: letter.subject,
        date: letter.eventDate!,
        location: letter.eventLocation || undefined,
        type: 'incoming' as const,
        letterNumber: letter.letterNumber,
        description: letter.description || undefined
      })),
      ...outgoingInvitations.map((letter: any) => ({
        id: letter.id,
        title: letter.subject,
        date: letter.eventDate!,
        location: letter.eventLocation || undefined,
        type: 'outgoing' as const,
        letterNumber: letter.letterNumber,
        description: letter.description || undefined
      }))
    ];

    // Sort by date
    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    res.json({ events });
  } catch (error) {
    console.error('Get calendar events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUpcomingEvents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const now = new Date();

    // Get upcoming invitation events
    const incomingInvitations = await prisma.incomingLetter.findMany({
      where: {
        isInvitation: true,
        eventDate: {
          gte: now
        }
      },
      select: {
        id: true,
        subject: true,
        eventDate: true,
        eventLocation: true,
        letterNumber: true,
        
      },
      orderBy: { eventDate: 'asc' },
      take: limit
    });

    const outgoingInvitations = await prisma.outgoingLetter.findMany({
      where: {
        isInvitation: true,
        eventDate: {
          gte: now
        }
      },
      select: {
        id: true,
        subject: true,
        eventDate: true,
        eventLocation: true,
        letterNumber: true,
        
      },
      orderBy: { eventDate: 'asc' },
      take: limit
    });

    // Combine and format events
    const allEvents: CalendarEvent[] = [
      ...incomingInvitations.map((letter: any) => ({
        id: letter.id,
        title: letter.subject,
        date: letter.eventDate!,
        location: letter.eventLocation || undefined,
        type: 'incoming' as const,
        letterNumber: letter.letterNumber,
        description: letter.description || undefined
      })),
      ...outgoingInvitations.map((letter: any) => ({
        id: letter.id,
        title: letter.subject,
        date: letter.eventDate!,
        location: letter.eventLocation || undefined,
        type: 'outgoing' as const,
        letterNumber: letter.letterNumber,
        description: letter.description || undefined
      }))
    ];

    // Sort by date and take limit
    const events = allEvents
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, limit);

    res.json({ events });
  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};