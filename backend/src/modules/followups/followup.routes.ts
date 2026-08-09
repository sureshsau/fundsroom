import { Router } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { updateFollowUpSchema } from '../customers/customer.schema';
import { getFollowUps, updateFollowUp, completeFollowUp } from '../customers/customer.controller';

const router = Router();
router.use(authMiddleware);

router.get('/', getFollowUps);
router.put('/:id', requireRole('ADMIN', 'SALES'), validate(updateFollowUpSchema), updateFollowUp);
router.patch('/:id/complete', requireRole('ADMIN', 'SALES'), completeFollowUp);

export default router;
