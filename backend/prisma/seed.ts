import { PrismaClient, UserRole, CustomerType, CustomerStatus, FollowUpStatus, MovementType, ReferenceType, ChallanStatus, NotificationType, AuditAction } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

// Helper for backdated timestamps
const daysAgo = (days: number, hours = 0): Date => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(date.getHours() - hours);
  return date;
};

async function main() {
  console.log('🧹 Clearing old database data...');

  // Delete in reverse order of foreign key dependencies
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.challanItem.deleteMany({});
  await prisma.salesChallan.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.customerFollowUp.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.stockType.deleteMany({});
  await prisma.otpVerification.deleteMany({});
  await prisma.notificationPreference.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('✨ Old database data cleared successfully!');
  console.log('🌱 Seeding rich enterprise sample data for video demonstration...');

  // ─── 1. Seed Users ──────────────────────────────────────────
  const usersData = [
    { name: 'System Admin', email: 'sureshsau631@gmail.com', password: 'Admin@123', role: 'ADMIN' as UserRole },
    { name: 'Rahul Singh (Sales)', email: 'sureshsau403@gmail.com', password: 'Sales@123', role: 'SALES' as UserRole },
    { name: 'Suresh Kumar (Warehouse)', email: 'sureshsau7586@gmail.com', password: 'Warehouse@123', role: 'WAREHOUSE' as UserRole },
    { name: 'Priya Sharma (Accounts)', email: 'accounts@fundsroom.com', password: 'Accounts@123', role: 'ACCOUNTS' as UserRole },
  ];

  const userMap = new Map<string, string>(); // role -> userId

  for (const u of usersData) {
    const passwordHash = await hashPassword(u.password);
    const createdUser = await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
        isEmailVerified: true,
        isActive: true,
        createdAt: daysAgo(2, 4),
      },
    });
    await prisma.notificationPreference.create({ data: { userId: createdUser.id } });
    userMap.set(u.role, createdUser.id);
    console.log(`✅ Created User: ${u.email} (${u.role})`);
  }

  const adminId = userMap.get('ADMIN')!;
  const salesId = userMap.get('SALES')!;
  const warehouseId = userMap.get('WAREHOUSE')!;
  const accountsId = userMap.get('ACCOUNTS')!;

  // ─── 2. Seed Stock Types (Categories) ───────────────────────
  const stockTypesData = [
    { name: 'Electronics', description: 'Electronic devices, peripherals, and computer components' },
    { name: 'Furniture', description: 'Office chairs, desks, stands, and physical ergonomics' },
    { name: 'Cables & Wiring', description: 'Display cables, networking, and power leads' },
    { name: 'Raw Material', description: 'Raw materials for manufacturing and assembly' },
    { name: 'Packaging & Supplies', description: 'Boxes, tape, labels, and shipping materials' },
    { name: 'Finished Goods', description: 'Ready-to-ship packaged inventory' },
  ];

  const stockTypeMap = new Map<string, string>(); // name -> stockTypeId

  for (const st of stockTypesData) {
    const created = await prisma.stockType.create({ data: st });
    stockTypeMap.set(st.name, created.id);
    console.log(`✅ Created Stock Type: ${st.name}`);
  }

  // ─── 3. Seed Products Catalog ───────────────────────────────
  const productsData = [
    {
      name: 'Dell UltraSharp 27" 4K Monitor',
      sku: 'ELEC-MON-001',
      stockTypeName: 'Electronics',
      unitPrice: 28500.00,
      currentStock: 45,
      minimumStock: 10,
      warehouseLocation: 'Rack A-12',
    },
    {
      name: 'Logitech MX Master 3S Wireless Mouse',
      sku: 'ELEC-MOU-002',
      stockTypeName: 'Electronics',
      unitPrice: 8990.00,
      currentStock: 8, // Low Stock Alert
      minimumStock: 15,
      warehouseLocation: 'Shelf B-04',
    },
    {
      name: 'Ergonomic Executive Mesh Chair',
      sku: 'FURN-CHR-003',
      stockTypeName: 'Furniture',
      unitPrice: 14500.00,
      currentStock: 2, // Critical Stock Alert
      minimumStock: 10,
      warehouseLocation: 'Warehouse Floor 2',
    },
    {
      name: 'Standing Electric Desk (Dual Motor)',
      sku: 'FURN-DSK-004',
      stockTypeName: 'Furniture',
      unitPrice: 32000.00,
      currentStock: 18,
      minimumStock: 5,
      warehouseLocation: 'Warehouse Floor 2',
    },
    {
      name: 'Cat6 Shielded Ethernet Cable 305m',
      sku: 'CABL-ETH-005',
      stockTypeName: 'Cables & Wiring',
      unitPrice: 6400.00,
      currentStock: 35,
      minimumStock: 12,
      warehouseLocation: 'Rack C-01',
    },
    {
      name: 'HDMI 2.1 Ultra High Speed Cable 2m',
      sku: 'CABL-HDM-006',
      stockTypeName: 'Cables & Wiring',
      unitPrice: 1250.00,
      currentStock: 4, // Critical Stock Alert
      minimumStock: 20,
      warehouseLocation: 'Rack C-02',
    },
    {
      name: 'Industrial Aluminum Extrusion Bar 2m',
      sku: 'RAW-ALU-007',
      stockTypeName: 'Raw Material',
      unitPrice: 2100.00,
      currentStock: 120,
      minimumStock: 30,
      warehouseLocation: 'Bay D-10',
    },
    {
      name: 'Copper Wire Spool 100m (1.5 sq mm)',
      sku: 'RAW-COP-008',
      stockTypeName: 'Raw Material',
      unitPrice: 3450.00,
      currentStock: 9, // Low Stock Alert
      minimumStock: 10,
      warehouseLocation: 'Bay D-12',
    },
    {
      name: 'Heavy Duty Corrugated Box (Large)',
      sku: 'PKG-BOX-009',
      stockTypeName: 'Packaging & Supplies',
      unitPrice: 85.00,
      currentStock: 450,
      minimumStock: 100,
      warehouseLocation: 'Packaging Zone 1',
    },
    {
      name: 'Industrial Bubble Wrap Roll (50m)',
      sku: 'PKG-BBL-010',
      stockTypeName: 'Packaging & Supplies',
      unitPrice: 1450.00,
      currentStock: 28,
      minimumStock: 10,
      warehouseLocation: 'Packaging Zone 2',
    },
    {
      name: 'Smart IoT Gateway Hub',
      sku: 'FIN-IOT-011',
      stockTypeName: 'Finished Goods',
      unitPrice: 12400.00,
      currentStock: 60,
      minimumStock: 15,
      warehouseLocation: 'Finished Goods Vault',
    },
    {
      name: 'Portable Power Station 1000W',
      sku: 'FIN-PWR-012',
      stockTypeName: 'Finished Goods',
      unitPrice: 48900.00,
      currentStock: 3, // Critical Stock Alert
      minimumStock: 8,
      warehouseLocation: 'Finished Goods Vault',
    },
  ];

  const productMap = new Map<string, any>(); // SKU -> Product

  for (const p of productsData) {
    const stockTypeId = stockTypeMap.get(p.stockTypeName);
    const created = await prisma.product.create({
      data: {
        name: p.name,
        sku: p.sku,
        category: p.stockTypeName,
        stockTypeId,
        unitPrice: p.unitPrice,
        currentStock: p.currentStock,
        minimumStock: p.minimumStock,
        warehouseLocation: p.warehouseLocation,
        createdAt: daysAgo(1, 12),
      },
    });
    productMap.set(p.sku, created);
    console.log(`✅ Created Product: ${p.name} (${p.sku}) - Stock: ${p.currentStock}`);
  }

  // ─── 4. Seed Customers (CRM) ──────────────────────────────
  const customersData = [
    {
      name: 'Apex Technologies Pvt Ltd',
      mobile: '9876543210',
      email: 'contact@apextech.com',
      businessName: 'Apex Technologies',
      gstNumber: '27AAACA12341Z1',
      customerType: 'WHOLESALE' as CustomerType,
      status: 'ACTIVE' as CustomerStatus,
      address: 'Tech Park, BKC, Mumbai - 400051',
      notes: 'Key enterprise IT client with recurring monthly orders',
      createdAt: daysAgo(2, 6),
    },
    {
      name: 'Blue Sky Enterprises',
      mobile: '9820098200',
      email: 'orders@blueskyent.in',
      businessName: 'Blue Sky Distribution',
      gstNumber: '27BBBCB56782Z2',
      customerType: 'DISTRIBUTOR' as CustomerType,
      status: 'ACTIVE' as CustomerStatus,
      address: 'MIDC Industrial Area, Pune - 411026',
      notes: 'Regional distributor for Maharashtra West region',
      createdAt: daysAgo(2, 2),
    },
    {
      name: 'Global Logistics Solutions',
      mobile: '9711097110',
      email: 'procurement@globallogistics.com',
      businessName: 'Global Logistics Corp',
      gstNumber: '29CCCC901233Z3',
      customerType: 'WHOLESALE' as CustomerType,
      status: 'ACTIVE' as CustomerStatus,
      address: 'Electronic City, Bangalore - 560100',
      notes: 'Procures packaging materials and tracking hardware in bulk',
      createdAt: daysAgo(1, 18),
    },
    {
      name: 'Metro Hardware & Electricals',
      mobile: '9988776655',
      email: 'metro.hardware@gmail.com',
      businessName: 'Metro Electricals Store',
      customerType: 'RETAIL' as CustomerType,
      status: 'ACTIVE' as CustomerStatus,
      address: 'Station Road, Thane West, Thane - 400601',
      notes: 'Retail hardware partner',
      createdAt: daysAgo(1, 10),
    },
    {
      name: 'Zenith Automation Systems',
      mobile: '9833445566',
      email: 'info@zenithauto.com',
      businessName: 'Zenith Automation',
      gstNumber: '27DDDD234564Z4',
      customerType: 'DISTRIBUTOR' as CustomerType,
      status: 'LEAD' as CustomerStatus,
      address: 'GIDC Phase 2, Ahmedabad - 382445',
      notes: 'Interested in bulk purchasing Smart IoT Gateway Hubs',
      createdAt: daysAgo(1, 4),
    },
    {
      name: 'Horizon Retail Outlets',
      mobile: '9766554433',
      email: 'purchasing@horizonretail.com',
      businessName: 'Horizon Mart',
      customerType: 'RETAIL' as CustomerType,
      status: 'ACTIVE' as CustomerStatus,
      address: 'Commercial Complex, Connaught Place, New Delhi - 110001',
      createdAt: daysAgo(1, 2),
    },
  ];

  const customerMap = new Map<string, any>(); // name -> customer

  for (const c of customersData) {
    const created = await prisma.customer.create({ data: c });
    customerMap.set(c.name, created);
    console.log(`✅ Created Customer: ${c.name} (${c.customerType})`);
  }

  // ─── 5. Seed Customer Follow-Ups (CRM Reminders) ───────────
  const followUpsData = [
    {
      customerName: 'Zenith Automation Systems',
      userId: salesId,
      followUpDate: daysAgo(-1, 2), // Overdue yesterday
      status: 'PENDING' as FollowUpStatus,
      notes: 'Finalize bulk discount proposal for Smart IoT Gateway Hub order',
      createdAt: daysAgo(1, 6),
    },
    {
      customerName: 'Apex Technologies Pvt Ltd',
      userId: salesId,
      followUpDate: daysAgo(1),
      status: 'COMPLETED' as FollowUpStatus,
      notes: 'Confirmed 4K Monitors delivery schedule with warehouse',
      createdAt: daysAgo(2),
    },
    {
      customerName: 'Blue Sky Enterprises',
      userId: salesId,
      followUpDate: daysAgo(0, 4), // 4 hours ago
      status: 'COMPLETED' as FollowUpStatus,
      notes: 'Dispatched Cat6 cable updated pricing catalog',
      createdAt: daysAgo(1),
    },
  ];

  for (const fu of followUpsData) {
    const cust = customerMap.get(fu.customerName)!;
    await prisma.customerFollowUp.create({
      data: {
        customerId: cust.id,
        userId: fu.userId,
        followUpDate: fu.followUpDate,
        status: fu.status,
        notes: fu.notes,
        createdAt: fu.createdAt,
      },
    });
    console.log(`✅ Created Follow-Up for ${fu.customerName}`);
  }

  // ─── 6. Seed Historical Stock Movements ───────────────────
  const stockMovementsData = [
    {
      productSku: 'ELEC-MON-001',
      quantity: 50,
      movementType: 'IN' as MovementType,
      reason: 'Initial Vendor Purchase Inward (PO-2026-88)',
      referenceType: 'PURCHASE' as ReferenceType,
      createdBy: warehouseId,
      createdAt: daysAgo(1, 20),
    },
    {
      productSku: 'ELEC-MON-001',
      quantity: 5,
      movementType: 'OUT' as MovementType,
      reason: 'Sales Challan CH-2026-00001',
      referenceType: 'SALES_CHALLAN' as ReferenceType,
      createdBy: salesId,
      createdAt: daysAgo(1, 2),
    },
    {
      productSku: 'FURN-CHR-003',
      quantity: 12,
      movementType: 'IN' as MovementType,
      reason: 'Batch Stock Inward',
      referenceType: 'PURCHASE' as ReferenceType,
      createdBy: warehouseId,
      createdAt: daysAgo(1, 16),
    },
    {
      productSku: 'FURN-CHR-003',
      quantity: 10,
      movementType: 'OUT' as MovementType,
      reason: 'Sales Challan CH-2026-00004 (Cancelled later)',
      referenceType: 'SALES_CHALLAN' as ReferenceType,
      createdBy: salesId,
      createdAt: daysAgo(0, 14),
    },
    {
      productSku: 'FURN-CHR-003',
      quantity: 10,
      movementType: 'IN' as MovementType,
      reason: 'Challan cancellation CH-2026-00004 stock restoration',
      referenceType: 'CHALLAN_CANCELLATION' as ReferenceType,
      createdBy: accountsId,
      createdAt: daysAgo(0, 10),
    },
    {
      productSku: 'CABL-ETH-005',
      quantity: 45,
      movementType: 'IN' as MovementType,
      reason: 'Bulk Cable Reel Receipt',
      referenceType: 'PURCHASE' as ReferenceType,
      createdBy: warehouseId,
      createdAt: daysAgo(1, 10),
    },
    {
      productSku: 'CABL-ETH-005',
      quantity: 10,
      movementType: 'OUT' as MovementType,
      reason: 'Sales Challan CH-2026-00001',
      referenceType: 'SALES_CHALLAN' as ReferenceType,
      createdBy: salesId,
      createdAt: daysAgo(1, 2),
    },
  ];

  for (const mv of stockMovementsData) {
    const prod = productMap.get(mv.productSku)!;
    await prisma.stockMovement.create({
      data: {
        productId: prod.id,
        quantity: mv.quantity,
        movementType: mv.movementType,
        reason: mv.reason,
        referenceType: mv.referenceType,
        createdBy: mv.createdBy,
        createdAt: mv.createdAt,
      },
    });
    console.log(`✅ Created Stock Movement: ${mv.movementType} ${mv.quantity} for ${mv.productSku}`);
  }

  // ─── 7. Seed Sales Challans (Invoices / Orders) ────────────
  // Challan 1: Confirmed
  const custApex = customerMap.get('Apex Technologies Pvt Ltd')!;
  const prodMon = productMap.get('ELEC-MON-001')!;
  const prodEth = productMap.get('CABL-ETH-005')!;

  const challan1 = await prisma.salesChallan.create({
    data: {
      challanNumber: 'CH-2026-00001',
      customerId: custApex.id,
      createdBy: salesId,
      status: 'CONFIRMED' as ChallanStatus,
      totalQuantity: 15,
      createdAt: daysAgo(1, 4),
      updatedAt: daysAgo(1, 2),
      items: {
        create: [
          {
            productId: prodMon.id,
            productName: prodMon.name,
            sku: prodMon.sku,
            unitPrice: prodMon.unitPrice,
            quantity: 5,
            totalPrice: Number(prodMon.unitPrice) * 5,
          },
          {
            productId: prodEth.id,
            productName: prodEth.name,
            sku: prodEth.sku,
            unitPrice: prodEth.unitPrice,
            quantity: 10,
            totalPrice: Number(prodEth.unitPrice) * 10,
          },
        ],
      },
    },
  });
  console.log(`✅ Created Sales Challan: ${challan1.challanNumber} (CONFIRMED)`);

  // Challan 2: Confirmed
  const custBlue = customerMap.get('Blue Sky Enterprises')!;
  const prodDesk = productMap.get('FURN-DSK-004')!;
  const prodIot = productMap.get('FIN-IOT-011')!;

  const challan2 = await prisma.salesChallan.create({
    data: {
      challanNumber: 'CH-2026-00002',
      customerId: custBlue.id,
      createdBy: adminId,
      status: 'CONFIRMED' as ChallanStatus,
      totalQuantity: 7,
      createdAt: daysAgo(0, 18),
      updatedAt: daysAgo(0, 16),
      items: {
        create: [
          {
            productId: prodDesk.id,
            productName: prodDesk.name,
            sku: prodDesk.sku,
            unitPrice: prodDesk.unitPrice,
            quantity: 2,
            totalPrice: Number(prodDesk.unitPrice) * 2,
          },
          {
            productId: prodIot.id,
            productName: prodIot.name,
            sku: prodIot.sku,
            unitPrice: prodIot.unitPrice,
            quantity: 5,
            totalPrice: Number(prodIot.unitPrice) * 5,
          },
        ],
      },
    },
  });
  console.log(`✅ Created Sales Challan: ${challan2.challanNumber} (CONFIRMED)`);

  // Challan 3: Draft
  const custMetro = customerMap.get('Metro Hardware & Electricals')!;
  const prodHdm = productMap.get('CABL-HDM-006')!;
  const prodCop = productMap.get('RAW-COP-008')!;

  const challan3 = await prisma.salesChallan.create({
    data: {
      challanNumber: 'CH-2026-00003',
      customerId: custMetro.id,
      createdBy: salesId,
      status: 'DRAFT' as ChallanStatus,
      totalQuantity: 6,
      createdAt: daysAgo(0, 3),
      updatedAt: daysAgo(0, 3),
      items: {
        create: [
          {
            productId: prodHdm.id,
            productName: prodHdm.name,
            sku: prodHdm.sku,
            unitPrice: prodHdm.unitPrice,
            quantity: 4,
            totalPrice: Number(prodHdm.unitPrice) * 4,
          },
          {
            productId: prodCop.id,
            productName: prodCop.name,
            sku: prodCop.sku,
            unitPrice: prodCop.unitPrice,
            quantity: 2,
            totalPrice: Number(prodCop.unitPrice) * 2,
          },
        ],
      },
    },
  });
  console.log(`✅ Created Sales Challan: ${challan3.challanNumber} (DRAFT)`);

  // ─── 8. Seed Notifications (In-App Feed) ───────────────────
  const notificationsData = [
    {
      userId: adminId,
      type: 'CRITICAL_STOCK' as NotificationType,
      title: '🔴 Critical Stock Alert',
      message: 'Portable Power Station 1000W stock is critically low (3 remaining, min: 8)',
      entityType: 'PRODUCT',
      entityId: productMap.get('FIN-PWR-012')!.id,
      isRead: false,
      createdAt: daysAgo(0, 2),
    },
    {
      userId: warehouseId,
      type: 'LOW_STOCK' as NotificationType,
      title: '⚠️ Low Stock Alert',
      message: 'Logitech MX Master 3S Wireless Mouse stock is low (8 remaining, min: 15)',
      entityType: 'PRODUCT',
      entityId: productMap.get('ELEC-MOU-002')!.id,
      isRead: false,
      createdAt: daysAgo(0, 5),
    },
    {
      userId: adminId,
      type: 'CHALLAN_CONFIRMED' as NotificationType,
      title: 'Challan Confirmed',
      message: 'CH-2026-00001 confirmed for Apex Technologies Pvt Ltd (15 units)',
      entityType: 'CHALLAN',
      entityId: challan1.id,
      isRead: true,
      createdAt: daysAgo(1, 2),
    },
    {
      userId: salesId,
      type: 'FOLLOWUP_DUE' as NotificationType,
      title: '📅 Follow-up Due',
      message: 'Follow-up due for Zenith Automation Systems',
      entityType: 'CUSTOMER',
      entityId: customerMap.get('Zenith Automation Systems')!.id,
      isRead: false,
      createdAt: daysAgo(1, 6),
    },
  ];

  for (const n of notificationsData) {
    await prisma.notification.create({ data: n });
    console.log(`✅ Created Notification for ${n.title}`);
  }

  // ─── 9. Seed Audit Logs ────────────────────────────────────
  const auditLogsData = [
    {
      userId: adminId,
      action: 'LOGIN' as AuditAction,
      entityType: 'USER',
      entityId: adminId,
      ipAddress: '192.168.1.100',
      createdAt: daysAgo(1, 22),
    },
    {
      userId: warehouseId,
      action: 'STOCK_IN' as AuditAction,
      entityType: 'PRODUCT',
      entityId: prodMon.id,
      newData: { quantity: 50, movementType: 'IN', reason: 'Initial Vendor Purchase' },
      ipAddress: '192.168.1.104',
      createdAt: daysAgo(1, 20),
    },
    {
      userId: salesId,
      action: 'CREATE_CUSTOMER' as AuditAction,
      entityType: 'CUSTOMER',
      entityId: custApex.id,
      newData: { name: custApex.name, customerType: custApex.customerType },
      ipAddress: '192.168.1.102',
      createdAt: daysAgo(1, 18),
    },
    {
      userId: salesId,
      action: 'CREATE_CHALLAN' as AuditAction,
      entityType: 'CHALLAN',
      entityId: challan1.id,
      newData: { challanNumber: 'CH-2026-00001', customerName: custApex.name, status: 'DRAFT' },
      ipAddress: '192.168.1.102',
      createdAt: daysAgo(1, 4),
    },
    {
      userId: accountsId,
      action: 'CONFIRM_CHALLAN' as AuditAction,
      entityType: 'CHALLAN',
      entityId: challan1.id,
      oldData: { status: 'DRAFT' },
      newData: { status: 'CONFIRMED', stockDeducted: true },
      ipAddress: '192.168.1.105',
      createdAt: daysAgo(1, 2),
    },
    {
      userId: adminId,
      action: 'CONFIRM_CHALLAN' as AuditAction,
      entityType: 'CHALLAN',
      entityId: challan2.id,
      oldData: { status: 'DRAFT' },
      newData: { status: 'CONFIRMED', stockDeducted: true },
      ipAddress: '192.168.1.100',
      createdAt: daysAgo(0, 16),
    },
  ];

  for (const al of auditLogsData) {
    await prisma.auditLog.create({ data: al });
    console.log(`✅ Created Audit Log: ${al.action}`);
  }

  console.log('\n🎉 Comprehensive enterprise sample data seeded successfully for video recording!\n');
  console.log('Active User Credentials:');
  console.log('  Admin:     sureshsau631@gmail.com  / Admin@123');
  console.log('  Sales:     sureshsau403@gmail.com  / Sales@123');
  console.log('  Warehouse: sureshsau7586@gmail.com / Warehouse@123');
  console.log('  Accounts:  accounts@fundsroom.com  / Accounts@123\n');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
