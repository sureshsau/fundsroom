import prisma from '../../database/prisma';
import { NotificationType } from '@prisma/client';
import { emitToUser, emitToRole } from '../../socket/socket.manager';
import { queueEmail } from '../../queues/email.queue';

interface CreateNotificationOptions {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}

export const createNotification = async (opts: CreateNotificationOptions) => {
  const notification = await prisma.notification.create({
    data: {
      userId: opts.userId,
      type: opts.type,
      title: opts.title,
      message: opts.message,
      entityType: opts.entityType,
      entityId: opts.entityId,
    },
  });

  // Emit to specific user via Socket.IO
  emitToUser(opts.userId, 'notification', notification);

  return notification;
};

export const notifyLowStock = async (
  product: { id: string; name: string; currentStock: number; minimumStock: number; imageUrl?: string }
): Promise<void> => {
  const isCritical = product.currentStock <= product.minimumStock / 2;
  const type = isCritical ? NotificationType.CRITICAL_STOCK : NotificationType.LOW_STOCK;
  const title = isCritical ? 'Critical Stock Alert' : 'Low Stock Alert';
  const message = isCritical
    ? `${product.name} stock is critically low (${product.currentStock} remaining, min: ${product.minimumStock})`
    : `${product.name} stock is low (${product.currentStock} remaining, min: ${product.minimumStock})`;

  // Get all WAREHOUSE and ADMIN users with their notification preferences
  const users = await prisma.user.findMany({
    where: {
      role: { in: ['WAREHOUSE', 'ADMIN'] },
      isActive: true,
    },
    include: { notificationPrefs: true },
  });

  for (const user of users) {
    const prefs = user.notificationPrefs;
    const socketEnabled = isCritical
      ? (prefs?.criticalStockSocket ?? true)
      : (prefs?.lowStockSocket ?? true);
    const emailEnabled = isCritical
      ? (prefs?.criticalStockEmail ?? true)
      : (prefs?.lowStockEmail ?? true);

    if (socketEnabled) {
      const notification = await prisma.notification.create({
        data: {
          userId: user.id,
          type,
          title,
          message,
          entityType: 'PRODUCT',
          entityId: product.id,
        },
      });
      emitToUser(user.id, 'notification', notification);
    }

    if (emailEnabled) {
      const emailType = isCritical ? 'SEND_CRITICAL_STOCK_EMAIL' : 'SEND_LOW_STOCK_EMAIL';
      await queueEmail(emailType, {
        to: user.email,
        productName: product.name,
        currentStock: product.currentStock,
        minimumStock: product.minimumStock,
        imageUrl: product.imageUrl,
      });
    }
  }
};

export const notifyChallanCreated = async (
  challan: { id: string; challanNumber: string; customerId: string; totalQuantity: number },
  customer: { name: string },
  createdByUserId: string
): Promise<void> => {
  // Notify ADMIN and WAREHOUSE users via Socket.IO real-time notification
  const users = await prisma.user.findMany({
    where: {
      role: { in: ['ADMIN', 'WAREHOUSE'] },
      isActive: true,
      id: { not: createdByUserId },
    },
  });

  for (const user of users) {
    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        type: NotificationType.CHALLAN_CREATED,
        title: 'New Draft Sales Challan',
        message: `Challan ${challan.challanNumber} drafted for ${customer.name} (${challan.totalQuantity} units)`,
        entityType: 'CHALLAN',
        entityId: challan.id,
      },
    });
    emitToUser(user.id, 'notification', notification);
  }
};

export const notifyChallanConfirmed = async (
  challan: { id: string; challanNumber: string; customerId: string },
  customer: { name: string; email?: string | null },
  createdByUserId: string,
  totalQuantity: number
): Promise<void> => {
  // 1. Send receipt email directly to Customer if customer has an email registered
  if (customer.email) {
    await queueEmail('SEND_CHALLAN_EMAIL', {
      to: customer.email,
      challanNumber: challan.challanNumber,
      customerName: customer.name,
      totalQuantity,
    });
  }

  // 2. Notify ACCOUNTS and ADMIN users via Socket.IO & In-App Notifications
  const users = await prisma.user.findMany({
    where: {
      role: { in: ['ACCOUNTS', 'ADMIN'] },
      isActive: true,
    },
    include: { notificationPrefs: true },
  });

  for (const user of users) {
    const prefs = user.notificationPrefs;
    const socketEnabled = prefs?.challanSocket ?? true;

    if (socketEnabled) {
      const notification = await prisma.notification.create({
        data: {
          userId: user.id,
          type: NotificationType.CHALLAN_CONFIRMED,
          title: 'Challan Confirmed',
          message: `${challan.challanNumber} confirmed for ${customer.name} (${totalQuantity} units)`,
          entityType: 'CHALLAN',
          entityId: challan.id,
        },
      });
      emitToUser(user.id, 'notification', notification);
    }
  }

  // 3. Also notify the creator via Socket.IO
  const creatorNotification = await prisma.notification.create({
    data: {
      userId: createdByUserId,
      type: NotificationType.CHALLAN_CONFIRMED,
      title: 'Your Challan is Confirmed',
      message: `${challan.challanNumber} for ${customer.name} has been confirmed`,
      entityType: 'CHALLAN',
      entityId: challan.id,
    },
  });
  emitToUser(createdByUserId, 'notification', creatorNotification);
};

export const notifyChallanCancelled = async (
  challan: { id: string; challanNumber: string },
  customer: { name: string },
  cancelledByUserId: string
): Promise<void> => {
  const users = await prisma.user.findMany({
    where: {
      role: { in: ['ACCOUNTS', 'ADMIN', 'SALES'] },
      isActive: true,
    },
  });

  for (const user of users) {
    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        type: NotificationType.CHALLAN_CANCELLED,
        title: 'Challan Cancelled',
        message: `${challan.challanNumber} for ${customer.name} has been cancelled`,
        entityType: 'CHALLAN',
        entityId: challan.id,
      },
    });
    emitToUser(user.id, 'notification', notification);
  }
};

export const notifyFollowupDue = async (
  followUp: { id: string; customerId: string },
  customer: { name: string },
  assignedUserId: string,
  isOverdue: boolean,
  overdueDays?: number
): Promise<void> => {
  const title = isOverdue ? '⚠️ Overdue Follow-up' : '📅 Follow-up Due';
  const message = isOverdue
    ? `Follow-up with ${customer.name} is overdue by ${overdueDays} day(s)`
    : `Follow-up due for ${customer.name}`;

  const notification = await prisma.notification.create({
    data: {
      userId: assignedUserId,
      type: isOverdue ? NotificationType.FOLLOWUP_OVERDUE : NotificationType.FOLLOWUP_DUE,
      title,
      message,
      entityType: 'CUSTOMER',
      entityId: followUp.customerId,
    },
  });
  emitToUser(assignedUserId, 'notification', notification);

  const user = await prisma.user.findUnique({ where: { id: assignedUserId }, include: { notificationPrefs: true } });
  if (user?.notificationPrefs?.followupEmail ?? true) {
    await queueEmail('SEND_FOLLOWUP_EMAIL', {
      to: user?.email,
      customerName: customer.name,
      followUpDate: new Date().toISOString(),
    });
  }
};
