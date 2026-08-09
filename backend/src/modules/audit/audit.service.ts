import prisma from '../../database/prisma';
import { AuditAction } from '@prisma/client';

interface CreateAuditLogOptions {
  userId: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  ipAddress?: string;
}

export const createAuditLog = async (opts: CreateAuditLogOptions): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: opts.userId,
        action: opts.action,
        entityType: opts.entityType,
        entityId: opts.entityId,
        oldData: opts.oldData ? (opts.oldData as object) : undefined,
        newData: opts.newData ? (opts.newData as object) : undefined,
        ipAddress: opts.ipAddress,
      },
    });
  } catch (err) {
    // Audit log failure should never break the main flow
    console.error('[Audit] Failed to create audit log:', (err as Error).message);
  }
};
