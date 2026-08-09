import { Request, Response, NextFunction } from 'express';
import * as challanService from './challan.service';
import { createAuditLog } from '../audit/audit.service';
import { ChallanStatus } from '@prisma/client';

export const getChallans = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await challanService.listChallans({
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      search: req.query.search as string,
      status: req.query.status as ChallanStatus,
      customerId: req.query.customerId as string,
      userId: req.query.userId as string,
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const getChallan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await challanService.getChallanById(req.params.id as string);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const createChallan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { customerId, items } = req.body;
    const result = await challanService.createDraftChallan(customerId, req.user!.userId, items);
    await createAuditLog({
      userId: req.user!.userId,
      action: 'CREATE_CHALLAN',
      entityType: 'CHALLAN',
      entityId: result.id,
      newData: { challanNumber: result.challanNumber, status: result.status } as Record<string, unknown>,
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const updateChallan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await challanService.updateDraftChallan(req.params.id as string, req.body);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const confirmChallan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await challanService.confirmChallan(req.params.id as string, req.user!.userId);
    res.json({ success: true, data: result, message: 'Challan confirmed successfully' });
  } catch (err) { next(err); }
};

export const cancelChallan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await challanService.cancelChallan(req.params.id as string, req.user!.userId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};
