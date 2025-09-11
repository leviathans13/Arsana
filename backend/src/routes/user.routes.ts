import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { getUsers, getCurrentUser } from '../controllers/user.controller';

const router: Router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/me', getCurrentUser);
router.get('/', authorize(['ADMIN']), getUsers);

export default router;