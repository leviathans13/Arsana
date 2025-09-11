import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

// Email transporter configuration
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Create notification in database
const createNotification = async (title: string, message: string, type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' = 'INFO', userId?: string) => {
  await prisma.notification.create({
    data: {
      title,
      message,
      type,
      userId
    }
  });
};

// Send email notification
const sendEmailNotification = async (to: string, subject: string, text: string, html?: string) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('Email credentials not configured, skipping email notification');
      return;
    }

    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      text,
      html
    });
    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error('Failed to send email:', error);
  }
};

// Check for upcoming events and send notifications
const checkUpcomingEvents = async () => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    // Get events happening tomorrow
    const upcomingIncoming = await prisma.incomingLetter.findMany({
      where: {
        isInvitation: true,
        eventDate: {
          gte: tomorrow,
          lt: dayAfterTomorrow
        }
      },
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });

    const upcomingOutgoing = await prisma.outgoingLetter.findMany({
      where: {
        isInvitation: true,
        eventDate: {
          gte: tomorrow,
          lt: dayAfterTomorrow
        }
      },
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });

    // Send notifications for incoming letter events
    for (const letter of upcomingIncoming) {
      const title = 'Upcoming Event Reminder';
      const message = `Event "${letter.subject}" is scheduled for tomorrow at ${letter.eventLocation || 'TBA'}`;
      
      await createNotification(title, message, 'INFO', letter.userId);
      
      await sendEmailNotification(
        letter.user.email,
        title,
        message,
        `<p><strong>${title}</strong></p><p>${message}</p><p><strong>Event:</strong> ${letter.subject}</p><p><strong>Date:</strong> ${letter.eventDate?.toLocaleDateString()}</p><p><strong>Location:</strong> ${letter.eventLocation || 'TBA'}</p>`
      );
    }

    // Send notifications for outgoing letter events
    for (const letter of upcomingOutgoing) {
      const title = 'Upcoming Event Reminder';
      const message = `Event "${letter.subject}" is scheduled for tomorrow at ${letter.eventLocation || 'TBA'}`;
      
      await createNotification(title, message, 'INFO', letter.userId);
      
      await sendEmailNotification(
        letter.user.email,
        title,
        message,
        `<p><strong>${title}</strong></p><p>${message}</p><p><strong>Event:</strong> ${letter.subject}</p><p><strong>Date:</strong> ${letter.eventDate?.toLocaleDateString()}</p><p><strong>Location:</strong> ${letter.eventLocation || 'TBA'}</p>`
      );
    }

    console.log(`Processed ${upcomingIncoming.length + upcomingOutgoing.length} event reminders`);
  } catch (error) {
    console.error('Error checking upcoming events:', error);
    await createNotification(
      'System Error',
      'Failed to check upcoming events. Please contact administrator.',
      'ERROR'
    );
  }
};

// Check for overdue invitations
const checkOverdueInvitations = async () => {
  try {
    const now = new Date();
    
    const overdueIncoming = await prisma.incomingLetter.findMany({
      where: {
        isInvitation: true,
        eventDate: {
          lt: now
        },
        // You could add a field to track if overdue notification was sent
      },
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        }
      },
      take: 10 // Limit to prevent spam
    });

    const overdueOutgoing = await prisma.outgoingLetter.findMany({
      where: {
        isInvitation: true,
        eventDate: {
          lt: now
        }
      },
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        }
      },
      take: 10
    });

    // Note: In a real application, you'd want to add a field to track if overdue notifications were already sent
    // to prevent sending the same notification repeatedly

    console.log(`Found ${overdueIncoming.length + overdueOutgoing.length} overdue invitations`);
  } catch (error) {
    console.error('Error checking overdue invitations:', error);
  }
};

// Start all cron jobs
export const startCronJobs = () => {
  console.log('Starting cron jobs...');

  // Check for upcoming events every day at 9 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('Running upcoming events check...');
    await checkUpcomingEvents();
  });

  // Check for overdue invitations every day at 6 PM
  cron.schedule('0 18 * * *', async () => {
    console.log('Running overdue invitations check...');
    await checkOverdueInvitations();
  });

  // Weekly summary notification (every Monday at 8 AM)
  cron.schedule('0 8 * * 1', async () => {
    console.log('Generating weekly summary...');
    
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Monday
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6); // Sunday

    const weeklyStats = await Promise.all([
      prisma.incomingLetter.count({
        where: {
          createdAt: {
            gte: startOfWeek,
            lte: endOfWeek
          }
        }
      }),
      prisma.outgoingLetter.count({
        where: {
          createdAt: {
            gte: startOfWeek,
            lte: endOfWeek
          }
        }
      })
    ]);

    await createNotification(
      'Weekly Summary',
      `This week: ${weeklyStats[0]} incoming letters, ${weeklyStats[1]} outgoing letters processed.`,
      'INFO'
    );
  });

  console.log('Cron jobs started successfully');
};