import { Request, Response, NextFunction } from 'express';
import * as customerService from './customer.service';
import { createAuditLog } from '../audit/audit.service';
import { CustomerStatus, CustomerType, FollowUpStatus } from '@prisma/client';

export const getCustomers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await customerService.listCustomers({
      page,
      limit,
      search: req.query.search as string,
      status: req.query.status as CustomerStatus,
      type: req.query.type as CustomerType,
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const getCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await customerService.getCustomerById(req.params.id as string);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const createCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await customerService.createCustomer(req.body);
    await createAuditLog({
      userId: req.user!.userId,
      action: 'CREATE_CUSTOMER',
      entityType: 'CUSTOMER',
      entityId: result.id,
      newData: result as unknown as Record<string, unknown>,
      ipAddress: req.ip,
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const updateCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const old = await customerService.getCustomerById(req.params.id as string);
    const result = await customerService.updateCustomer(req.params.id as string, req.body);
    await createAuditLog({
      userId: req.user!.userId,
      action: 'UPDATE_CUSTOMER',
      entityType: 'CUSTOMER',
      entityId: result.id,
      oldData: old as unknown as Record<string, unknown>,
      newData: result as unknown as Record<string, unknown>,
      ipAddress: req.ip,
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const deleteCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await customerService.deleteCustomer(req.params.id as string);
    await createAuditLog({
      userId: req.user!.userId,
      action: 'DELETE_CUSTOMER',
      entityType: 'CUSTOMER',
      entityId: req.params.id as string,
      ipAddress: req.ip,
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// Follow-ups
export const getFollowUps = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await customerService.listFollowUps({
      page,
      limit,
      userId: req.query.myOnly === 'true' ? req.user!.userId : undefined,
      status: req.query.status as FollowUpStatus,
      customerId: req.query.customerId as string,
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const createFollowUp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await customerService.createFollowUp(req.params.id as string, req.user!.userId, req.body);
    await createAuditLog({
      userId: req.user!.userId,
      action: 'CREATE_FOLLOWUP',
      entityType: 'CUSTOMER',
      entityId: req.params.id as string,
      newData: result as unknown as Record<string, unknown>,
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const updateFollowUp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await customerService.updateFollowUp(req.params.id as string, req.user!.userId, req.body);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const completeFollowUp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await customerService.completeFollowUp(req.params.id as string);
    await createAuditLog({
      userId: req.user!.userId,
      action: 'COMPLETE_FOLLOWUP',
      entityType: 'FOLLOWUP',
      entityId: req.params.id as string,
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};
