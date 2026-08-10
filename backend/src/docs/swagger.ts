import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'ERP + CRM Operations Portal API',
    version: '1.0.0',
    description: 'REST API documentation for Full-Stack ERP & CRM Operations Portal',
    contact: { name: 'Support', email: 'admin@example.com' },
  },
  servers: [
    { url: 'http://localhost:8000/api', description: 'Local Development Server' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Error message' },
          errorCode: { type: 'string', example: 'INVALID_CREDENTIALS' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', example: 'admin@example.com' },
          password: { type: 'string', example: 'Admin@123' },
        },
      },
      UserResponse: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string', enum: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] },
          isActive: { type: 'boolean' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': {
      get: {
        summary: 'Health check endpoint',
        responses: { 200: { description: 'Server is healthy' } },
      },
    },
    '/auth/login': {
      post: {
        summary: 'User login',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          200: { description: 'Login successful' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Get current user profile',
        responses: { 200: { description: 'User profile data' } },
      },
    },
    '/customers': {
      get: { summary: 'List customers with filters & pagination' },
      post: { summary: 'Create new customer' },
    },
    '/products': {
      get: { summary: 'List products' },
      post: { summary: 'Create product' },
    },
    '/inventory/stock-in': {
      post: { summary: 'Record stock-in movement' },
    },
    '/challans': {
      get: { summary: 'List sales challans' },
      post: { summary: 'Create draft sales challan' },
    },
    '/challans/{id}/confirm': {
      post: { summary: 'Confirm sales challan (stock safety enforced)' },
    },
    '/dashboard/summary': {
      get: { summary: 'Get role-aware dashboard summary & analytics' },
    },
    '/notifications': {
      get: { summary: 'List user notifications' },
    },
    '/audit-logs': {
      get: { summary: 'List audit logs (Admin only)' },
    },
  },
};

export const setupSwagger = (app: Express): void => {
  try {
    app.get('/api-docs/json', (req, res) => {
      res.json(swaggerDocument);
    });
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    console.log(`📚 Swagger documentation initialized`);
  } catch (err) {
    console.warn('[Swagger] Warning: Swagger UI setup failed:', (err as Error).message);
  }
};
