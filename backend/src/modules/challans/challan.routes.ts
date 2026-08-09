import { Router } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createChallanSchema, updateChallanSchema, listChallansSchema } from './challan.schema';
import {
  getChallans,
  getChallan,
  createChallan,
  updateChallan,
  confirmChallan,
  cancelChallan,
} from './challan.controller';

const router = Router();
router.use(authMiddleware);

router.get('/', validate(listChallansSchema), getChallans);
router.post('/', requireRole('ADMIN', 'SALES', 'WAREHOUSE'), validate(createChallanSchema), createChallan);
router.get('/:id', getChallan);
router.put('/:id', requireRole('ADMIN', 'SALES', 'WAREHOUSE'), validate(updateChallanSchema), updateChallan);
router.post('/:id/confirm', requireRole('ADMIN', 'SALES', 'WAREHOUSE'), confirmChallan);
router.post('/:id/cancel', requireRole('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'), cancelChallan);

export default router;
