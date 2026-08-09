import prisma from '../../database/prisma';
import { ApiError } from '../../middleware/error.middleware';
import { CustomerStatus, CustomerType, FollowUpStatus, Prisma } from '@prisma/client';

export const listCustomers = async (opts: {
  page: number;
  limit: number;
  search?: string;
  status?: CustomerStatus;
  type?: CustomerType;
}) => {
  const { page, limit, search, status, type } = opts;
  const skip = (page - 1) * limit;

  const where: Prisma.CustomerWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { mobile: { contains: search } },
      { businessName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (status) where.status = status;
  if (type) where.customerType = type;

  const [data, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.customer.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const getCustomerById = async (id: string) => {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      followUps: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      challans: {
        include: {
          creator: { select: { id: true, name: true } },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });

  if (!customer) throw new ApiError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND');
  return customer;
};

export const createCustomer = async (data: {
  name: string;
  mobile: string;
  email?: string;
  businessName?: string;
  gstNumber?: string;
  customerType: CustomerType;
  address?: string;
  status: CustomerStatus;
  followUpDate?: string;
  notes?: string;
}) => {
  return prisma.customer.create({
    data: {
      name: data.name,
      mobile: data.mobile,
      email: data.email || null,
      businessName: data.businessName,
      gstNumber: data.gstNumber,
      customerType: data.customerType,
      address: data.address,
      status: data.status,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      notes: data.notes,
    },
  });
};

export const updateCustomer = async (id: string, data: Partial<{
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  gstNumber: string;
  customerType: CustomerType;
  address: string;
  status: CustomerStatus;
  followUpDate: string;
  notes: string;
}>) => {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND');

  return prisma.customer.update({
    where: { id },
    data: {
      ...data,
      email: data.email || null,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
    },
  });
};

export const deleteCustomer = async (id: string) => {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND');

  // Soft delete - set inactive
  return prisma.customer.update({
    where: { id },
    data: { status: 'INACTIVE' },
  });
};

// ─── Follow-ups ──────────────────────────────────

export const createFollowUp = async (customerId: string, userId: string, data: {
  followUpDate: string;
  notes?: string;
}) => {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new ApiError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND');

  return prisma.customerFollowUp.create({
    data: {
      customerId,
      userId,
      followUpDate: new Date(data.followUpDate),
      notes: data.notes,
      status: 'PENDING',
    },
    include: {
      customer: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
    },
  });
};

export const listFollowUps = async (opts: {
  userId?: string;
  status?: FollowUpStatus;
  customerId?: string;
  page: number;
  limit: number;
}) => {
  const { page, limit } = opts;
  const skip = (page - 1) * limit;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

  const where: Prisma.CustomerFollowUpWhereInput = {};
  if (opts.userId) where.userId = opts.userId;
  if (opts.status) where.status = opts.status;
  if (opts.customerId) where.customerId = opts.customerId;

  const [data, total] = await Promise.all([
    prisma.customerFollowUp.findMany({
      where,
      skip,
      take: limit,
      include: {
        customer: { select: { id: true, name: true, mobile: true, businessName: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { followUpDate: 'asc' },
    }),
    prisma.customerFollowUp.count({ where }),
  ]);

  // Add category
  const enriched = data.map((fu: any) => ({
    ...fu,
    category:
      fu.followUpDate < todayStart
        ? 'OVERDUE'
        : fu.followUpDate <= todayEnd
        ? 'DUE_TODAY'
        : 'UPCOMING',
  }));

  return { data: enriched, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const updateFollowUp = async (id: string, userId: string, data: Partial<{
  followUpDate: string;
  notes: string;
  status: FollowUpStatus;
}>) => {
  const existing = await prisma.customerFollowUp.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Follow-up not found', 'FOLLOWUP_NOT_FOUND');

  return prisma.customerFollowUp.update({
    where: { id },
    data: {
      ...data,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
    },
    include: {
      customer: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
    },
  });
};

export const completeFollowUp = async (id: string) => {
  const existing = await prisma.customerFollowUp.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'Follow-up not found', 'FOLLOWUP_NOT_FOUND');

  return prisma.customerFollowUp.update({
    where: { id },
    data: { status: 'COMPLETED' },
  });
};
