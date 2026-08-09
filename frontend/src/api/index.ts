import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Auth ──────────────────────────────────────────
export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  sendOtp: (data: { email: string; purpose: string }) => api.post('/auth/send-otp', data),
  verifyOtp: (data: { email: string; otp: string; purpose: string }) => api.post('/auth/verify-otp', data),
  forgotPassword: (data: { email: string }) => api.post('/auth/forgot-password', data),
  resetPassword: (data: { email: string; otp: string; newPassword: string }) => api.post('/auth/reset-password', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// ─── Customers ─────────────────────────────────────
export const customersApi = {
  list: (params?: Record<string, unknown>) => api.get('/customers', { params }),
  get: (id: string) => api.get(`/customers/${id}`),
  create: (data: Record<string, unknown>) => api.post('/customers', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
  createFollowUp: (customerId: string, data: Record<string, unknown>) =>
    api.post(`/customers/${customerId}/followups`, data),
};

// ─── Follow-ups ────────────────────────────────────
export const followupsApi = {
  list: (params?: Record<string, unknown>) => api.get('/followups', { params }),
  update: (id: string, data: Record<string, unknown>) => api.put(`/followups/${id}`, data),
  complete: (id: string) => api.patch(`/followups/${id}/complete`),
};

// ─── Stock Types (Dynamic Categories) ──────────────
export const stockTypesApi = {
  list: () => api.get('/stock-types'),
  get: (id: string) => api.get(`/stock-types/${id}`),
  create: (data: { name: string; description?: string }) => api.post('/stock-types', data),
  update: (id: string, data: { name?: string; description?: string }) => api.put(`/stock-types/${id}`, data),
  delete: (id: string) => api.delete(`/stock-types/${id}`),
};

// ─── Products ──────────────────────────────────────
export const productsApi = {
  list: (params?: Record<string, unknown>) => api.get('/products', { params }),
  get: (id: string) => api.get(`/products/${id}`),
  create: (data: Record<string, unknown>) => api.post('/products', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/products/${id}`, data),
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/products/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ─── Inventory ─────────────────────────────────────
export const inventoryApi = {
  movements: (params?: Record<string, unknown>) => api.get('/inventory/movements', { params }),
  stockIn: (data: Record<string, unknown>) => api.post('/inventory/stock-in', data),
  lowStock: () => api.get('/inventory/low-stock'),
  summary: () => api.get('/inventory/summary'),
};

// ─── Challans ──────────────────────────────────────
export const challansApi = {
  list: (params?: Record<string, unknown>) => api.get('/challans', { params }),
  get: (id: string) => api.get(`/challans/${id}`),
  create: (data: Record<string, unknown>) => api.post('/challans', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/challans/${id}`, data),
  confirm: (id: string) => api.post(`/challans/${id}/confirm`),
  cancel: (id: string) => api.post(`/challans/${id}/cancel`),
};

// ─── Notifications ─────────────────────────────────
export const notificationsApi = {
  list: (params?: Record<string, unknown>) => api.get('/notifications', { params }),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  getPreferences: () => api.get('/notifications/preferences'),
  updatePreferences: (data: Record<string, unknown>) => api.put('/notifications/preferences', data),
};

// ─── Audit Logs ────────────────────────────────────
export const auditApi = {
  list: (params?: Record<string, unknown>) => api.get('/audit-logs', { params }),
};

// ─── Users ─────────────────────────────────────────
export const usersApi = {
  list: () => api.get('/users'),
  create: (data: Record<string, unknown>) => api.post('/users', data),
  toggle: (id: string) => api.patch(`/users/${id}/toggle`),
};

// ─── Dashboard ─────────────────────────────────────
export const dashboardApi = {
  summary: () => api.get('/dashboard/summary'),
};
