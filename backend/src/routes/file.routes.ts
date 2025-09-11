import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { downloadFile } from '../controllers/file.controller';

const router: Router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/:type/:id', downloadFile);

export default router;