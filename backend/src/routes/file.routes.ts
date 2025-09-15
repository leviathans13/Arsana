import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { downloadFile, previewFile, getFileInfo } from '../controllers/file.controller';

const router: Router = Router();

// All routes require authentication
router.use(authenticate);

// Get file information
router.get('/:type/:id/info', getFileInfo);

// Preview file (for images and PDFs) 
router.get('/:type/:id/preview', previewFile);

// Download file
router.get('/:type/:id', downloadFile);

export default router;