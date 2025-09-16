import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createIncomingLetter,
  getIncomingLetters,
  getIncomingLetterById,
  showEditForm,
  updateIncomingLetter,
  deleteIncomingLetter,
  upload
} from '../controllers/incomingLetter.controller';

const router: Router = Router();

// All routes require authentication
router.use(authenticate);

router.post('/', upload.single('file'), createIncomingLetter);
router.get('/', getIncomingLetters);
router.get('/:id/edit', showEditForm);
router.get('/:id', getIncomingLetterById);
router.put('/:id', upload.single('file'), updateIncomingLetter);
router.delete('/:id', deleteIncomingLetter);

export default router;