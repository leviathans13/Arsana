import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createOutgoingLetter,
  getOutgoingLetters,
  getOutgoingLetterById,
  updateOutgoingLetter,
  deleteOutgoingLetter,
  downloadOutgoingLetter
} from '../controllers/outgoingLetter.controller';
import { upload } from '../controllers/incomingLetter.controller';

const router: Router = Router();

// All routes require authentication
router.use(authenticate);

router.post('/', upload.single('file'), createOutgoingLetter);
router.get('/', getOutgoingLetters);
router.get('/edit/:id', getOutgoingLetterById); // Route for edit form
router.get('/download/:id', downloadOutgoingLetter); // Route for file download
router.get('/:id', getOutgoingLetterById);
router.put('/:id', upload.single('file'), updateOutgoingLetter);
router.delete('/:id', deleteOutgoingLetter);

export default router;