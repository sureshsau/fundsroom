// ─── Shared Types ────────────────────────────────────

export type UserRole = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ─── Customer ────────────────────────────────────────

export type CustomerStatus = 'LEAD' | 'ACTIVE' | 'INACTIVE';
export type CustomerType = 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';

export interface Customer {
  id: string;
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
  createdAt: string;
  updatedAt: string;
}

export type FollowUpStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';
export type FollowUpCategory = 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING';

export interface FollowUp {
  id: string;
  customerId: string;
  userId: string;
  followUpDate: string;
  notes?: string;
  status: FollowUpStatus;
  category?: FollowUpCategory;
  customer?: { id: string; name: string; mobile: string; businessName?: string };
  user?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

// ─── Stock Type (Dynamic Category) ────────────────────

export interface StockType {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    products: number;
  };
}

// ─── Product ─────────────────────────────────────────

export type StockStatus = 'HEALTHY' | 'LOW' | 'CRITICAL';

export interface Product {
  id: string;
  name: string;
  sku: string;
  category?: string;
  stockTypeId?: string;
  stockType?: StockType;
  unitPrice: number;
  currentStock: number;
  minimumStock: number;
  warehouseLocation?: string;
  imageUrl?: string;
  stockStatus: StockStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  quantity: number;
  movementType: 'IN' | 'OUT';
  reason?: string;
  referenceType?: string;
  referenceId?: string;
  createdBy: string;
  createdAt: string;
  product?: { id: string; name: string; sku: string; imageUrl?: string };
  user?: { id: string; name: string };
}

// ─── Challan ─────────────────────────────────────────

export type ChallanStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export interface ChallanItem {
  id: string;
  challanId: string;
  productId: string;
  productName: string;
  sku: string;
  unitPrice: number;
  imageUrl?: string;
  quantity: number;
  totalPrice: number;
  product?: { id: string; name: string; sku: string; currentStock: number; imageUrl?: string };
}

export interface Challan {
  id: string;
  challanNumber: string;
  customerId: string;
  status: ChallanStatus;
  totalQuantity: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; name: string; mobile: string; businessName?: string; email?: string };
  creator?: { id: string; name: string; email: string };
  items: ChallanItem[];
}

// ─── Notification ─────────────────────────────────────

export type NotificationType =
  | 'LOW_STOCK' | 'CRITICAL_STOCK'
  | 'CHALLAN_CREATED' | 'CHALLAN_CONFIRMED' | 'CHALLAN_CANCELLED'
  | 'FOLLOWUP_DUE' | 'FOLLOWUP_OVERDUE'
  | 'STOCK_RECEIVED' | 'NEW_CUSTOMER';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

// ─── Audit Log ───────────────────────────────────────

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
  user?: { id: string; name: string; email: string; role: UserRole };
}

// ─── Dashboard ───────────────────────────────────────

export interface DashboardSummary {
  overview: {
    totalCustomers: number;
    totalProducts: number;
    totalChallans: number;
    totalInventoryValue: number;
    lowStockCount: number;
    criticalStockCount: number;
    pendingFollowUps: number;
    overdueFollowUps: number;
    dueTodayFollowUps: number;
  };
  inventory: {
    healthy: number;
    lowStock: number;
    critical: number;
    criticalProducts: Product[];
  };
  charts: {
    customerTypes: { type: CustomerType; count: number }[];
    challansByDay: { createdAt: string; _count: number }[];
  };
  recent: {
    challans: Challan[];
    stockMovements: StockMovement[];
  };
}
