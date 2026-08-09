import { Request, Response, NextFunction } from 'express';
import * as stockTypeService from './stockType.service';

export const getStockTypes = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await stockTypeService.listStockTypes();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getStockType = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await stockTypeService.getStockTypeById(req.params.id as string);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createStockType = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await stockTypeService.createStockType(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateStockType = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await stockTypeService.updateStockType(req.params.id as string, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const deleteStockType = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await stockTypeService.deleteStockType(req.params.id as string);
    res.json({ success: true, message: 'Stock type deleted successfully' });
  } catch (err) {
    next(err);
  }
};
