import { Router } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { uploadSingleImage } from '../../middleware/upload.middleware';
import { createProductSchema, updateProductSchema, listProductsSchema } from './product.schema';
import { getProducts, getProduct, createProduct, updateProduct, uploadProductImage } from './product.controller';

const router = Router();
router.use(authMiddleware);

router.get('/', validate(listProductsSchema), getProducts);
router.post('/upload-image', requireRole('ADMIN', 'WAREHOUSE'), uploadSingleImage, uploadProductImage);
router.post('/', requireRole('ADMIN', 'WAREHOUSE'), validate(createProductSchema), createProduct);
router.get('/:id', getProduct);
router.put('/:id', requireRole('ADMIN', 'WAREHOUSE'), validate(updateProductSchema), updateProduct);

export default router;
