import { Router } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { stockInSchema } from '../products/product.schema';
import { stockIn, getStockMovements, getLowStock, getInventorySummary } from '../products/product.controller';

const router = Router();
router.use(authMiddleware);

router.get('/movements', getStockMovements);
router.post('/stock-in', requireRole('ADMIN', 'WAREHOUSE'), validate(stockInSchema), stockIn);
router.get('/low-stock', getLowStock);
router.get('/summary', getInventorySummary);

export default router;
