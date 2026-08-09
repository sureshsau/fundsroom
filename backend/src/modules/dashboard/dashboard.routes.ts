import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { Request, Response, NextFunction } from 'express';
import prisma from '../../database/prisma';

const router = Router();
router.use(authMiddleware);

const getDashboardSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const role = req.user!.role;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Core stats everyone gets
    const [
      totalCustomers, totalProducts, totalChallans,
      allProducts, confirmedChallans,
      pendingFollowUps, overdueFollowUps, dueTodayFollowUps,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.product.count(),
      prisma.salesChallan.count(),
      prisma.product.findMany(),
      prisma.salesChallan.findMany({
        where: { status: 'CONFIRMED' },
        include: { items: true },
      }),
      prisma.customerFollowUp.count({
        where: { status: 'PENDING', followUpDate: { gt: todayEnd } },
      }),
      prisma.customerFollowUp.count({
        where: { status: 'PENDING', followUpDate: { lt: todayStart } },
      }),
      prisma.customerFollowUp.count({
        where: {
          status: 'PENDING',
          followUpDate: { gte: todayStart, lt: todayEnd },
        },
      }),
    ]);

    const lowStockProducts = allProducts.filter((p: { currentStock: number; minimumStock: number }) => p.currentStock <= p.minimumStock && p.currentStock > p.minimumStock / 2);
    const criticalProducts = allProducts.filter((p: { currentStock: number; minimumStock: number }) => p.currentStock <= p.minimumStock / 2);
    const totalInventoryValue = allProducts.reduce((sum: number, p: { unitPrice: unknown; currentStock: number }) => sum + Number(p.unitPrice) * p.currentStock, 0);

    // Challan chart data (last 30 days)
    const challansByDay = await prisma.salesChallan.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: thirtyDaysAgo }, status: { not: 'CANCELLED' } },
      _count: true,
    });

    // Customer type distribution
    const customerTypes = await prisma.customer.groupBy({
      by: ['customerType'],
      _count: true,
    });

    // Recent challans
    const recentChallans = await prisma.salesChallan.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { customer: { select: { name: true } }, creator: { select: { name: true } } },
    });

    // Recent stock movements
    const recentMovements = await prisma.stockMovement.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { name: true, sku: true } },
        user: { select: { name: true } },
      },
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalCustomers,
          totalProducts,
          totalChallans,
          totalInventoryValue,
          lowStockCount: lowStockProducts.length,
          criticalStockCount: criticalProducts.length,
          pendingFollowUps,
          overdueFollowUps,
          dueTodayFollowUps,
        },
        inventory: {
          healthy: allProducts.length - lowStockProducts.length - criticalProducts.length,
          lowStock: lowStockProducts.length,
          critical: criticalProducts.length,
          criticalProducts: criticalProducts.slice(0, 5),
        },
        charts: {
          customerTypes: customerTypes.map((ct) => ({
            type: ct.customerType,
            count: ct._count,
          })),
          challansByDay,
        },
        recent: {
          challans: recentChallans,
          stockMovements: recentMovements,
        },
      },
    });
  } catch (err) { next(err); }
};

router.get('/summary', getDashboardSummary);

export default router;
