import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { Request, Response, NextFunction } from 'express';
import prisma from '../../database/prisma';

const router = Router();
router.use(authMiddleware);

const getNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [data, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user!.userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where: { userId: req.user!.userId } }),
      prisma.notification.count({ where: { userId: req.user!.userId, isRead: false } }),
    ]);

    res.json({ success: true, data: { data, total, page, limit, totalPages: Math.ceil(total / limit), unreadCount } });
  } catch (err) { next(err); }
};

const markRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id as string, userId: req.user!.userId },
      data: { isRead: true },
    });
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) { next(err); }
};

const markAllRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) { next(err); }
};

const getPreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let prefs = await prisma.notificationPreference.findUnique({ where: { userId: req.user!.userId } });
    if (!prefs) {
      prefs = await prisma.notificationPreference.create({ data: { userId: req.user!.userId } });
    }
    res.json({ success: true, data: prefs });
  } catch (err) { next(err); }
};

const updatePreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prefs = await prisma.notificationPreference.upsert({
      where: { userId: req.user!.userId },
      create: { userId: req.user!.userId, ...req.body },
      update: req.body,
    });
    res.json({ success: true, data: prefs });
  } catch (err) { next(err); }
};

router.get('/', getNotifications);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);
router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);

export default router;
