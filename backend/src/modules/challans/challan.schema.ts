import { z } from 'zod';

export const createChallanSchema = z.object({
  body: z.object({
    customerId: z.string().uuid('Valid customer ID required'),
    items: z
      .array(
        z.object({
          productId: z.string().uuid('Valid product ID required'),
          quantity: z.number().int().positive('Quantity must be positive'),
        })
      )
      .min(1, 'At least one item required'),
  }),
});

export const updateChallanSchema = z.object({
  body: z.object({
    customerId: z.string().uuid().optional(),
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          quantity: z.number().int().positive(),
        })
      )
      .min(1)
      .optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
});

export const listChallansSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']).optional(),
    customerId: z.string().uuid().optional(),
  }),
});
