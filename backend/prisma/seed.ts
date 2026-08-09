import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
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
  console.log('🌱 Seeding fresh initial stock types & user accounts (0 products seeded)...');

  // ─── Seed Stock Types (Dynamic Categories) ───────
  const stockTypesData = [
    { name: 'Electronics', description: 'Electronic devices, peripherals, and computer components' },
    { name: 'Furniture', description: 'Office chairs, desks, stands, and physical ergonomics' },
    { name: 'Cables & Wiring', description: 'Display cables, networking, and power leads' },
    { name: 'Raw Material', description: 'Raw materials for manufacturing and assembly' },
    { name: 'Packaging & Supplies', description: 'Boxes, tape, labels, and shipping materials' },
    { name: 'Finished Goods', description: 'Ready-to-ship packaged inventory' },
  ];

  for (const st of stockTypesData) {
    await prisma.stockType.create({ data: st });
    console.log(`✅ Created Stock Type: ${st.name}`);
  }

  // ─── Seed Users Only ─────────────────────────────
  const users = [
    { name: 'System Admin', email: 'admin-sureshsau631@gmail.com', password: 'Admin@123', role: 'ADMIN' as const },
    { name: 'Rahul Singh', email: 'sales-sureshsau403@gmail.com', password: 'Sales@123', role: 'SALES' as const },
    { name: 'Suresh Kumar', email: 'wirehouse-sureshsau7586@gmail.com', password: 'Warehouse@123', role: 'WAREHOUSE' as const },
    { name: 'Priya Sharma', email: 'accounts@example.com', password: 'Accounts@123', role: 'ACCOUNTS' as const },
  ];

  for (const userData of users) {
    const passwordHash = await hashPassword(userData.password);
    const user = await prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        passwordHash,
        role: userData.role,
        isEmailVerified: true,
        isActive: true,
      },
    });
    await prisma.notificationPreference.create({ data: { userId: user.id } });
    console.log(`✅ Created user: ${userData.email} (${userData.role})`);
  }

  console.log('\n🎉 Database reset completed with ZERO products seeded!\n');
  console.log('Test Credentials:');
  console.log('  Admin:     admin-sureshsau631@gmail.com     / Admin@123');
  console.log('  Sales:     sales-sureshsau403@gmail.com     / Sales@123');
  console.log('  Warehouse: wirehouse-sureshsau7586@gmail.com / Warehouse@123');
  console.log('  Accounts:  accounts@example.com             / Accounts@123\n');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
