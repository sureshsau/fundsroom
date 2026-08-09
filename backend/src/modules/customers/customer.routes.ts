import { Router } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersSchema,
  createFollowUpSchema,
  updateFollowUpSchema,
} from './customer.schema';
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getFollowUps,
  createFollowUp,
  updateFollowUp,
  completeFollowUp,
} from './customer.controller';

const router = Router();
router.use(authMiddleware);

// Customers
router.get('/', validate(listCustomersSchema), getCustomers);
router.post('/', requireRole('ADMIN', 'SALES'), validate(createCustomerSchema), createCustomer);
router.get('/:id', getCustomer);
router.put('/:id', requireRole('ADMIN', 'SALES'), validate(updateCustomerSchema), updateCustomer);
router.delete('/:id', requireRole('ADMIN'), deleteCustomer);

// Follow-ups
router.post('/:id/followups', requireRole('ADMIN', 'SALES'), validate(createFollowUpSchema), createFollowUp);

export default router;
