import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(200),
    sku: z.string().min(1, 'SKU is required').max(100),
    category: z.string().optional(),
    stockTypeId: z.string().optional().nullable(),
    unitPrice: z.number().min(0, 'Price must be non-negative'),
    currentStock: z.number().int().min(0).default(0),
    minimumStock: z.number().int().min(0).default(0),
    warehouseLocation: z.string().optional(),
    imageUrl: z.string().optional().nullable(),
  }),
});

export const updateProductSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    sku: z.string().min(1).max(100).optional(),
    category: z.string().optional(),
    stockTypeId: z.string().optional().nullable(),
    unitPrice: z.number().min(0).optional(),
    minimumStock: z.number().int().min(0).optional(),
    warehouseLocation: z.string().optional(),
    imageUrl: z.string().optional().nullable(),
  }),
  params: z.object({ id: z.string() }),
});

export const listProductsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    category: z.string().optional(),
    stockTypeId: z.string().optional(),
    warehouseLocation: z.string().optional(),
    lowStock: z.string().optional(),
  }),
});

export const stockInSchema = z.object({
  body: z.object({
    productId: z.string().uuid('Valid product ID required'),
    quantity: z.number().int().positive('Quantity must be positive'),
    reason: z.string().optional(),
  }),
});
