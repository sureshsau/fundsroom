import { Router } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { Request, Response, NextFunction } from 'express';
import prisma from '../../database/prisma';
import { AuditAction } from '@prisma/client';

const router = Router();
router.use(authMiddleware);
router.use(requireRole('ADMIN'));

const getAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (req.query.userId) where.userId = req.query.userId;
    if (req.query.action) where.action = req.query.action as AuditAction;
    if (req.query.entityType) where.entityType = req.query.entityType;
    if (req.query.entityId) where.entityId = req.query.entityId;
    if (req.query.from || req.query.to) {
      where.createdAt = {
        ...(req.query.from ? { gte: new Date(req.query.from as string) } : {}),
        ...(req.query.to ? { lte: new Date(req.query.to as string) } : {}),
      };
    }

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ success: true, data: { data, total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

router.get('/', getAuditLogs);

export default router;
