import { Request, Response, NextFunction } from 'express';
import * as productService from './product.service';
import { createAuditLog } from '../audit/audit.service';
import prisma from '../../database/prisma';
import { uploadImageToCloudinary } from '../../services/cloudinary.service';
import { ApiError } from '../../middleware/error.middleware';

export const getProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await productService.listProducts({
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      search: req.query.search as string,
      category: req.query.category as string,
      stockTypeId: req.query.stockTypeId as string,
      warehouseLocation: req.query.warehouseLocation as string,
      lowStock: req.query.lowStock === 'true',
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await productService.getProductById(req.params.id as string);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await productService.createProduct(req.body);
    await createAuditLog({
      userId: req.user!.userId,
      action: 'CREATE_PRODUCT',
      entityType: 'PRODUCT',
      entityId: result.id,
      newData: result as unknown as Record<string, unknown>,
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const old = await productService.getProductById(req.params.id as string);
    const result = await productService.updateProduct(req.params.id as string, req.body);
    await createAuditLog({
      userId: req.user!.userId,
      action: 'UPDATE_PRODUCT',
      entityType: 'PRODUCT',
      entityId: result.id,
      oldData: old as unknown as Record<string, unknown>,
      newData: result as unknown as Record<string, unknown>,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const uploadProductImage = async (req: Request, res: Response, NextFunction: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'No image file uploaded', 'NO_FILE_UPLOADED');
    }

    const imageUrl = await uploadImageToCloudinary(
      req.file.buffer,
      'erp_stock_images',
      req.file.mimetype
    );

    res.json({
      success: true,
      data: { imageUrl },
      message: 'Image uploaded to Cloudinary successfully',
    });
  } catch (err) {
    NextFunction(err);
  }
};

export const getLowStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await productService.getLowStockProducts();
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getInventorySummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await productService.getInventorySummary();
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const stockIn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { productId, quantity, reason } = req.body;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found', errorCode: 'PRODUCT_NOT_FOUND' });
      return;
    }

    const updatedProduct = await prisma.$transaction(async (tx: any) => {
      const updated = await tx.product.update({
        where: { id: productId },
        data: { currentStock: { increment: quantity } },
      });

      await tx.stockMovement.create({
        data: {
          productId,
          quantity,
          movementType: 'IN',
          reason: reason || 'Manual stock addition',
          referenceType: 'PURCHASE',
          createdBy: req.user!.userId,
        },
      });

      return updated;
    });

    await createAuditLog({
      userId: req.user!.userId,
      action: 'STOCK_IN',
      entityType: 'PRODUCT',
      entityId: productId,
      oldData: { stock: product.currentStock } as Record<string, unknown>,
      newData: { stock: updatedProduct.currentStock, added: quantity } as Record<string, unknown>,
    });

    res.json({ success: true, data: updatedProduct, message: `Added ${quantity} units to ${product.name}` });
  } catch (err) {
    next(err);
  }
};

export const getStockMovements = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const productId = req.query.productId as string;

    const where = productId ? { productId } : {};
    const [data, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: { select: { id: true, name: true, sku: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    res.json({ success: true, data: { data, total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
};
