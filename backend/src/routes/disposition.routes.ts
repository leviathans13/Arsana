import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createDisposition,
  getAllDispositions,
  getDisposition,
  getDispositionsByLetter,
  updateDisposition,
  deleteDisposition
} from '../controllers/disposition.controller';

const router = Router();

// All disposition routes require authentication
router.use(authenticate);

// Disposition routes
router.post('/', createDisposition);                    // POST /api/dispositions
router.get('/', getAllDispositions);                    // GET /api/dispositions
router.get('/letter/:letterId', getDispositionsByLetter); // GET /api/dispositions/letter/:letterId  
router.get('/:id', getDisposition);                     // GET /api/dispositions/:id
router.put('/:id', updateDisposition);                  // PUT /api/dispositions/:id
router.delete('/:id', deleteDisposition);               // DELETE /api/dispositions/:id

export default router;