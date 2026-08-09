import { Router } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.middleware';
import { createUserService } from '../auth/auth.service';
import { createAuditLog } from '../audit/audit.service';
import prisma from '../../database/prisma';

const router = Router();
router.use(authMiddleware);

const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name required'),
    email: z.string().email('Valid email required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']),
  }),
});

const getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, role: true,
        isActive: true, isEmailVerified: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
};

const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await createUserService(req.body);
    await createAuditLog({
      userId: req.user!.userId,
      action: 'CREATE_USER',
      entityType: 'USER',
      entityId: result.id,
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

const toggleUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id as string } });
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    const updated = await prisma.user.update({
      where: { id: req.params.id as string },
      data: { isActive: !user.isActive },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

router.get('/', requireRole('ADMIN'), getUsers);
router.post('/', requireRole('ADMIN'), validate(createUserSchema), createUser);
router.patch('/:id/toggle', requireRole('ADMIN'), toggleUser);

export default router;
