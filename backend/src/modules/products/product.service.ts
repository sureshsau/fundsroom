import prisma from '../../database/prisma';
import { ApiError } from '../../middleware/error.middleware';
import type { Prisma } from '@prisma/client';

export const listProducts = async (opts: {
  page: number;
  limit: number;
  search?: string;
  category?: string;
  stockTypeId?: string;
  warehouseLocation?: string;
  lowStock?: boolean;
}) => {
  const { page, limit } = opts;
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {};
  if (opts.search) {
    where.OR = [
      { name: { contains: opts.search, mode: 'insensitive' } },
      { sku: { contains: opts.search, mode: 'insensitive' } },
      { category: { contains: opts.search, mode: 'insensitive' } },
    ];
  }
  if (opts.category) where.category = { contains: opts.category, mode: 'insensitive' };
  if (opts.stockTypeId) where.stockTypeId = opts.stockTypeId;
  if (opts.warehouseLocation) where.warehouseLocation = { contains: opts.warehouseLocation, mode: 'insensitive' };

  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      include: {
        stockType: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.count({ where }),
  ]);

  // Annotate stock status
  const enriched = data.map((p: any) => ({
    ...p,
    stockStatus:
      p.currentStock <= p.minimumStock / 2
        ? 'CRITICAL'
        : p.currentStock <= p.minimumStock
        ? 'LOW'
        : 'HEALTHY',
  }));

  const filtered = opts.lowStock ? enriched.filter((p: any) => p.stockStatus !== 'HEALTHY') : enriched;

  return { data: filtered, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const getProductById = async (id: string) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      stockType: true,
      stockMovements: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 30,
      },
    },
  });
  if (!product) throw new ApiError(404, 'Product not found', 'PRODUCT_NOT_FOUND');

  return {
    ...product,
    stockStatus:
      product.currentStock <= product.minimumStock / 2
        ? 'CRITICAL'
        : product.currentStock <= product.minimumStock
        ? 'LOW'
        : 'HEALTHY',
  };
};

export const createProduct = async (data: {
  name: string;
  sku: string;
  category?: string;
  stockTypeId?: string | null;
  unitPrice: number;
  currentStock: number;
  minimumStock: number;
  warehouseLocation?: string;
  imageUrl?: string | null;
}) => {
  const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
  if (existing) throw new ApiError(409, 'SKU already exists', 'SKU_EXISTS');

  const stockTypeId = data.stockTypeId ? data.stockTypeId : null;
  if (stockTypeId) {
    const stockTypeExists = await prisma.stockType.findUnique({ where: { id: stockTypeId } });
    if (!stockTypeExists) {
      throw new ApiError(400, 'Selected Stock Type does not exist', 'STOCK_TYPE_NOT_FOUND');
    }
  }

  return prisma.product.create({
    data: {
      name: data.name,
      sku: data.sku,
      category: data.category,
      stockTypeId,
      unitPrice: data.unitPrice,
      currentStock: data.currentStock,
      minimumStock: data.minimumStock,
      warehouseLocation: data.warehouseLocation,
      imageUrl: data.imageUrl || null,
    },
    include: {
      stockType: true,
    },
  });
};

export const updateProduct = async (
  id: string,
  data: Partial<{
    name: string;
    sku: string;
    category: string;
    stockTypeId: string | null;
    unitPrice: number;
    currentStock: number;
    minimumStock: number;
    warehouseLocation: string;
    imageUrl: string | null;
  }>
) => {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Product not found', 'PRODUCT_NOT_FOUND');

  if (data.sku && data.sku !== existing.sku) {
    const skuConflict = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (skuConflict) throw new ApiError(409, 'SKU already taken', 'SKU_EXISTS');
  }

  const updateData: any = { ...data };

  if (data.stockTypeId !== undefined) {
    const cleanStockTypeId = data.stockTypeId ? data.stockTypeId : null;
    if (cleanStockTypeId) {
      const stockTypeExists = await prisma.stockType.findUnique({ where: { id: cleanStockTypeId } });
      if (!stockTypeExists) {
        throw new ApiError(400, 'Selected Stock Type does not exist', 'STOCK_TYPE_NOT_FOUND');
      }
    }
    updateData.stockTypeId = cleanStockTypeId;
  }

  return prisma.product.update({
    where: { id },
    data: updateData,
    include: {
      stockType: true,
    },
  });
};

export const getLowStockProducts = async () => {
  const products = await prisma.product.findMany({
    include: { stockType: true },
    orderBy: { currentStock: 'asc' },
  });
  return products
    .filter((p: any) => p.currentStock <= p.minimumStock)
    .map((p: any) => ({
      ...p,
      stockStatus: p.currentStock <= p.minimumStock / 2 ? 'CRITICAL' : 'LOW',
    }));
};

export const getInventorySummary = async () => {
  const products = await prisma.product.findMany({ include: { stockType: true } });
  const healthy = products.filter((p: any) => p.currentStock > p.minimumStock);
  const low = products.filter((p: any) => p.currentStock <= p.minimumStock && p.currentStock > p.minimumStock / 2);
  const critical = products.filter((p: any) => p.currentStock <= p.minimumStock / 2);

  const totalValue = products.reduce((sum: number, p: any) => sum + Number(p.unitPrice) * p.currentStock, 0);

  return {
    totalProducts: products.length,
    healthy: healthy.length,
    lowStock: low.length,
    critical: critical.length,
    totalInventoryValue: totalValue,
    criticalProducts: critical.slice(0, 10),
    lowStockProducts: low.slice(0, 10),
  };
};
