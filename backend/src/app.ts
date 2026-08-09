import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { errorMiddleware } from './middleware/error.middleware';

// Routes
import authRoutes from './modules/auth/auth.routes';
import customerRoutes from './modules/customers/customer.routes';
import followupRoutes from './modules/followups/followup.routes';
import productRoutes from './modules/products/product.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import challanRoutes from './modules/challans/challan.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import auditRoutes from './modules/audit/audit.routes';
import userRoutes from './modules/users/user.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import stockTypeRoutes from './modules/stockTypes/stockType.routes';

import { setupSwagger } from './docs/swagger';

const app = express();

// ─── Swagger Documentation ───────────────────────────
setupSwagger(app);

// ─── Security Middleware ─────────────────────────────
app.use(helmet());
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Request Parsing ─────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Logging ─────────────────────────────────────────
if (config.nodeEnv !== 'test') {
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
}

// ─── Health Check ─────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ─── API Routes ──────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/followups', followupRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/challans', challanRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/stock-types', stockTypeRoutes);

// ─── 404 Handler ─────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found', errorCode: 'NOT_FOUND' });
});

// ─── Error Handler ───────────────────────────────────
app.use(errorMiddleware);

export default app;
