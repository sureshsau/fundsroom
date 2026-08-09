import { z } from 'zod';

export const createCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(200),
    mobile: z.string().min(10, 'Valid mobile number required').max(15),
    email: z.string().email().optional().or(z.literal('')),
    businessName: z.string().optional(),
    gstNumber: z.string().optional(),
    customerType: z.enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR']).default('RETAIL'),
    address: z.string().optional(),
    status: z.enum(['LEAD', 'ACTIVE', 'INACTIVE']).default('LEAD'),
    followUpDate: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const updateCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    mobile: z.string().min(10).max(15).optional(),
    email: z.string().email().optional().or(z.literal('')),
    businessName: z.string().optional(),
    gstNumber: z.string().optional(),
    customerType: z.enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR']).optional(),
    address: z.string().optional(),
    status: z.enum(['LEAD', 'ACTIVE', 'INACTIVE']).optional(),
    followUpDate: z.string().optional(),
    notes: z.string().optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
});

export const listCustomersSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    status: z.enum(['LEAD', 'ACTIVE', 'INACTIVE']).optional(),
    type: z.enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR']).optional(),
  }),
});

export const createFollowUpSchema = z.object({
  body: z.object({
    followUpDate: z.string().min(1, 'Follow-up date required'),
    notes: z.string().optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
});

export const updateFollowUpSchema = z.object({
  body: z.object({
    followUpDate: z.string().optional(),
    notes: z.string().optional(),
    status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
});
