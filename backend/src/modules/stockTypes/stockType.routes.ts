import { Router } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import * as stockTypeController from './stockType.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', stockTypeController.getStockTypes);
router.get('/:id', stockTypeController.getStockType);
router.post('/', requireRole('ADMIN', 'WAREHOUSE'), stockTypeController.createStockType);
router.put('/:id', requireRole('ADMIN', 'WAREHOUSE'), stockTypeController.updateStockType);
router.delete('/:id', requireRole('ADMIN', 'WAREHOUSE'), stockTypeController.deleteStockType);

export default router;
