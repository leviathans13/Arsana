import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getCalendarEvents, getUpcomingEvents } from '../controllers/calendar.controller';

const router: Router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/events', getCalendarEvents);
router.get('/upcoming', getUpcomingEvents);

export default router;