import prisma from '../../database/prisma';
import { ApiError } from '../../middleware/error.middleware';

export const listStockTypes = async () => {
  return prisma.stockType.findMany({
    include: {
      _count: {
        select: { products: true },
      },
    },
    orderBy: { name: 'asc' },
  });
};

export const getStockTypeById = async (id: string) => {
  const stockType = await prisma.stockType.findUnique({
    where: { id },
    include: {
      _count: { select: { products: true } },
    },
  });
  if (!stockType) {
    throw new ApiError(404, 'Stock type not found', 'STOCK_TYPE_NOT_FOUND');
  }
  return stockType;
};

export const createStockType = async (data: { name: string; description?: string }) => {
  const existing = await prisma.stockType.findUnique({ where: { name: data.name } });
  if (existing) {
    throw new ApiError(400, 'A stock type with this name already exists', 'DUPLICATE_STOCK_TYPE');
  }
  return prisma.stockType.create({
    data: {
      name: data.name,
      description: data.description || null,
    },
  });
};

export const updateStockType = async (id: string, data: { name?: string; description?: string }) => {
  await getStockTypeById(id);
  if (data.name) {
    const existing = await prisma.stockType.findFirst({
      where: { name: data.name, id: { not: id } },
    });
    if (existing) {
      throw new ApiError(400, 'A stock type with this name already exists', 'DUPLICATE_STOCK_TYPE');
    }
  }
  return prisma.stockType.update({
    where: { id },
    data,
  });
};

export const deleteStockType = async (id: string) => {
  await getStockTypeById(id);
  return prisma.stockType.delete({ where: { id } });
};
