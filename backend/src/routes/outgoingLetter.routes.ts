import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createOutgoingLetter,
  getOutgoingLetters,
  getOutgoingLetterById,
  updateOutgoingLetter,
  deleteOutgoingLetter
} from '../controllers/outgoingLetter.controller';
import { upload } from '../controllers/incomingLetter.controller';

const router: Router = Router();

// All routes require authentication
router.use(authenticate);

router.post('/', upload.single('file'), createOutgoingLetter);
router.get('/', getOutgoingLetters);
router.get('/:id', getOutgoingLetterById);
router.put('/:id', upload.single('file'), updateOutgoingLetter);
router.delete('/:id', deleteOutgoingLetter);

export default router;