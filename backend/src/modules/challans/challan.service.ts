import prisma from '../../database/prisma';
import { ApiError } from '../../middleware/error.middleware';
import { ChallanStatus, Prisma } from '@prisma/client';
import { notifyLowStock, notifyChallanConfirmed, notifyChallanCancelled, notifyChallanCreated } from '../notifications/notification.service';
import { createAuditLog } from '../audit/audit.service';

// ─── Challan Number Generation ───────────────────────
const generateChallanNumber = async (tx: Prisma.TransactionClient): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `CH-${year}-`;

  const lastChallan = await tx.salesChallan.findFirst({
    where: { challanNumber: { startsWith: prefix } },
    orderBy: { challanNumber: 'desc' },
  });

  let seq = 1;
  if (lastChallan) {
    const parts = lastChallan.challanNumber.split('-');
    seq = parseInt(parts[parts.length - 1]) + 1;
  }

  return `${prefix}${seq.toString().padStart(5, '0')}`;
};

// ─── List Challans ──────────────────────────────────
export const listChallans = async (opts: {
  page: number;
  limit: number;
  search?: string;
  status?: ChallanStatus;
  customerId?: string;
  userId?: string; // filter by creator for SALES role
}) => {
  const skip = (opts.page - 1) * opts.limit;
  const where: Prisma.SalesChallanWhereInput = {};

  if (opts.search) {
    where.OR = [
      { challanNumber: { contains: opts.search, mode: 'insensitive' } },
      { customer: { name: { contains: opts.search, mode: 'insensitive' } } },
    ];
  }
  if (opts.status) where.status = opts.status;
  if (opts.customerId) where.customerId = opts.customerId;
  if (opts.userId) where.createdBy = opts.userId;

  const [data, total] = await Promise.all([
    prisma.salesChallan.findMany({
      where,
      skip,
      take: opts.limit,
      include: {
        customer: { select: { id: true, name: true, businessName: true } },
        creator: { select: { id: true, name: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.salesChallan.count({ where }),
  ]);

  return { data, total, page: opts.page, limit: opts.limit, totalPages: Math.ceil(total / opts.limit) };
};

// ─── Get Challan by ID ──────────────────────────────
export const getChallanById = async (id: string) => {
  const challan = await prisma.salesChallan.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, mobile: true, businessName: true, email: true } },
      creator: { select: { id: true, name: true, email: true } },
      items: {
        include: { product: { select: { id: true, name: true, sku: true, currentStock: true } } },
      },
    },
  });

  if (!challan) throw new ApiError(404, 'Challan not found', 'CHALLAN_NOT_FOUND');
  return challan;
};

// ─── Create Draft Challan ───────────────────────────
export const createDraftChallan = async (
  customerId: string,
  createdBy: string,
  items: { productId: string; quantity: number }[]
) => {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new ApiError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND');

  // Validate all products exist
  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  if (products.length !== productIds.length) {
    throw new ApiError(400, 'One or more products not found', 'PRODUCT_NOT_FOUND');
  }

  const challan = await prisma.$transaction(async (tx: any) => {
    const challanNumber = await generateChallanNumber(tx);
    const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

    const productMap = new Map(products.map((p: any) => [p.id, p]));

    const newChallan = await tx.salesChallan.create({
      data: {
        challanNumber,
        customerId,
        createdBy,
        status: 'DRAFT',
        totalQuantity,
        items: {
          create: items.map((item) => {
            const product = productMap.get(item.productId)!;
            return {
              productId: item.productId,
              productName: product.name,      // snapshot
              sku: product.sku,               // snapshot
              unitPrice: product.unitPrice,   // snapshot
              imageUrl: product.imageUrl || null, // snapshot
              quantity: item.quantity,
              totalPrice: Number(product.unitPrice) * item.quantity,
            };
          }),
        },
      },
      include: {
        customer: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        items: true,
      },
    });

    return newChallan;
  });

  notifyChallanCreated(
    { id: challan.id, challanNumber: challan.challanNumber, customerId: challan.customerId, totalQuantity: challan.totalQuantity },
    { name: challan.customer.name },
    createdBy
  ).catch((err) => console.error('[Notification] Draft challan notify failed:', err));

  return challan;
};

// ─── Confirm Challan (Critical Transaction) ─────────
export const confirmChallan = async (id: string, confirmedByUserId: string) => {
  // This entire operation is wrapped in a transaction with stock safety
  const result = await prisma.$transaction(
    async (tx: any) => {
      // 1. Fetch challan with a lock-equivalent check
      const challan = await tx.salesChallan.findUnique({
        where: { id },
        include: {
          items: true,
          customer: true,
        },
      });

      if (!challan) throw new ApiError(404, 'Challan not found', 'CHALLAN_NOT_FOUND');
      if (challan.status !== 'DRAFT') {
        throw new ApiError(400, `Cannot confirm challan in ${challan.status} status`, 'INVALID_STATUS');
      }

      // 2. For each item, atomically check and deduct stock
      for (const item of challan.items) {
        const result = await tx.product.updateMany({
          where: {
            id: item.productId,
            currentStock: { gte: item.quantity },
          },
          data: {
            currentStock: { decrement: item.quantity },
          },
        });

        if (result.count === 0) {
          throw new ApiError(
            400,
            `Insufficient stock for ${item.productName}`,
            'INSUFFICIENT_STOCK',
          );
        }
      }

      // 3. Create stock movement records
      for (const item of challan.items) {
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            movementType: 'OUT',
            reason: `Sales Challan ${challan.challanNumber}`,
            referenceType: 'SALES_CHALLAN',
            referenceId: challan.id,
            createdBy: confirmedByUserId,
          },
        });
      }

      // 4. Update challan status
      const updatedChallan = await tx.salesChallan.update({
        where: { id },
        data: { status: 'CONFIRMED' },
        include: {
          customer: true,
          creator: true,
          items: true,
        },
      });

      return { updatedChallan, challan };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 10000,
    }
  );

  const { updatedChallan } = result;

  // 5. Post-transaction: Audit + Notifications (non-blocking)
  await createAuditLog({
    userId: confirmedByUserId,
    action: 'CONFIRM_CHALLAN',
    entityType: 'CHALLAN',
    entityId: id,
    oldData: { status: 'DRAFT' } as Record<string, unknown>,
    newData: { status: 'CONFIRMED', challanNumber: updatedChallan.challanNumber } as Record<string, unknown>,
  });

  // 6. Check low stock and send notifications
  for (const item of updatedChallan.items) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } });
    if (product && product.currentStock <= product.minimumStock) {
      // Fire low stock notification (non-blocking)
      notifyLowStock({
        id: product.id,
        name: product.name,
        currentStock: product.currentStock,
        minimumStock: product.minimumStock,
        imageUrl: product.imageUrl || undefined,
      }).catch((err) => console.error('[Notification] Low stock notify failed:', err));
    }
  }

  // 7. Notify challan confirmed
  notifyChallanConfirmed(
    { id: updatedChallan.id, challanNumber: updatedChallan.challanNumber, customerId: updatedChallan.customerId },
    { name: updatedChallan.customer.name },
    confirmedByUserId,
    updatedChallan.totalQuantity
  ).catch((err) => console.error('[Notification] Challan notify failed:', err));

  return updatedChallan;
};

// ─── Cancel Challan ──────────────────────────────────
export const cancelChallan = async (id: string, cancelledByUserId: string) => {
  const challan = await prisma.salesChallan.findUnique({
    where: { id },
    include: { items: true, customer: true },
  });

  if (!challan) throw new ApiError(404, 'Challan not found', 'CHALLAN_NOT_FOUND');
  if (challan.status === 'CANCELLED') {
    throw new ApiError(400, 'Challan is already cancelled', 'ALREADY_CANCELLED');
  }

  const wasConfirmed = challan.status === 'CONFIRMED';

  await prisma.$transaction(async (tx: any) => {
    if (wasConfirmed) {
      // Restore stock
      for (const item of challan.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { increment: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            movementType: 'IN',
            reason: `Challan cancellation ${challan.challanNumber}`,
            referenceType: 'CHALLAN_CANCELLATION',
            referenceId: challan.id,
            createdBy: cancelledByUserId,
          },
        });
      }
    }

    await tx.salesChallan.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  });

  await createAuditLog({
    userId: cancelledByUserId,
    action: 'CANCEL_CHALLAN',
    entityType: 'CHALLAN',
    entityId: id,
    oldData: { status: challan.status } as Record<string, unknown>,
    newData: { status: 'CANCELLED', stockRestored: wasConfirmed } as Record<string, unknown>,
  });

  notifyChallanCancelled(
    { id: challan.id, challanNumber: challan.challanNumber },
    { name: challan.customer.name },
    cancelledByUserId
  ).catch(() => {});

  return { message: 'Challan cancelled successfully', stockRestored: wasConfirmed };
};

// ─── Update Draft Challan ────────────────────────────
export const updateDraftChallan = async (
  id: string,
  data: { customerId?: string; items?: { productId: string; quantity: number }[] }
) => {
  const challan = await prisma.salesChallan.findUnique({ where: { id }, include: { items: true } });
  if (!challan) throw new ApiError(404, 'Challan not found', 'CHALLAN_NOT_FOUND');
  if (challan.status !== 'DRAFT') {
    throw new ApiError(400, 'Can only edit DRAFT challans', 'INVALID_STATUS');
  }

  if (!data.items) {
    return prisma.salesChallan.update({
      where: { id },
      data: { customerId: data.customerId },
      include: { customer: true, creator: true, items: true },
    });
  }

  const productIds = data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((p: any) => [p.id, p]));
  const totalQuantity = data.items.reduce((sum, i) => sum + i.quantity, 0);

  return prisma.$transaction(async (tx: any) => {
    // Delete existing items
    await tx.challanItem.deleteMany({ where: { challanId: id } });

    return tx.salesChallan.update({
      where: { id },
      data: {
        customerId: data.customerId,
        totalQuantity,
        items: {
          create: data.items!.map((item) => {
            const product = productMap.get(item.productId)!;
            return {
              productId: item.productId,
              productName: product.name,
              sku: product.sku,
              unitPrice: product.unitPrice,
              imageUrl: product.imageUrl || null,
              quantity: item.quantity,
              totalPrice: Number(product.unitPrice) * item.quantity,
            };
          }),
        },
      },
      include: { customer: true, creator: true, items: true },
    });
  });
};
