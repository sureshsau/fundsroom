import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, NotificationProvider, useAuth } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';

// App Pages
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { CustomersPage } from './pages/customers/CustomersPage';
import { CustomerDetailPage } from './pages/customers/CustomerDetailPage';
import { ProductsPage } from './pages/products/ProductsPage';
import { ProductDetailPage } from './pages/products/ProductDetailPage';
import { InventoryPage } from './pages/inventory/InventoryPage';
import { ChallansPage } from './pages/challans/ChallansPage';
import { CreateChallanPage } from './pages/challans/CreateChallanPage';
import { ChallanDetailPage } from './pages/challans/ChallanDetailPage';
import { NotificationsPage } from './pages/notifications/NotificationsPage';
import { AuditLogsPage } from './pages/audit/AuditLogsPage';
import { UsersPage } from './pages/users/UsersPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import type { UserRole } from './types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30 * 1000, // 30 seconds
    },
  },
});

// ─── Route Guards ─────────────────────────────────────

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f1f5f9' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, border: '4px solid #e2e8f0',
            borderTopColor: '#2563eb', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px'
          }} />
          <div style={{ fontSize: 14, color: '#64748b' }}>Loading...</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

// ─── App Router ─────────────────────────────────────

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={<ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>}
      />
      <Route
        path="/customers"
        element={<ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']}><AppLayout><CustomersPage /></AppLayout></ProtectedRoute>}
      />
      <Route
        path="/customers/:id"
        element={<ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']}><AppLayout><CustomerDetailPage /></AppLayout></ProtectedRoute>}
      />
      <Route
        path="/products"
        element={<ProtectedRoute><AppLayout><ProductsPage /></AppLayout></ProtectedRoute>}
      />
      <Route
        path="/products/:id"
        element={<ProtectedRoute><AppLayout><ProductDetailPage /></AppLayout></ProtectedRoute>}
      />
      <Route
        path="/inventory"
        element={<ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE']}><AppLayout><InventoryPage /></AppLayout></ProtectedRoute>}
      />
      <Route
        path="/challans"
        element={<ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']}><AppLayout><ChallansPage /></AppLayout></ProtectedRoute>}
      />
      <Route
        path="/challans/create"
        element={<ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'WAREHOUSE']}><AppLayout><CreateChallanPage /></AppLayout></ProtectedRoute>}
      />
      <Route
        path="/challans/:id"
        element={<ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']}><AppLayout><ChallanDetailPage /></AppLayout></ProtectedRoute>}
      />
      <Route
        path="/notifications"
        element={<ProtectedRoute><AppLayout><NotificationsPage /></AppLayout></ProtectedRoute>}
      />
      <Route
        path="/audit-logs"
        element={<ProtectedRoute allowedRoles={['ADMIN']}><AppLayout><AuditLogsPage /></AppLayout></ProtectedRoute>}
      />
      <Route
        path="/users"
        element={<ProtectedRoute allowedRoles={['ADMIN']}><AppLayout><UsersPage /></AppLayout></ProtectedRoute>}
      />
      <Route
        path="/settings"
        element={<ProtectedRoute><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>}
      />

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            <AppRoutes />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  borderRadius: '10px',
                  background: '#1e293b',
                  color: '#f8fafc',
                  fontSize: '14px',
                  fontFamily: 'Inter, sans-serif',
                  maxWidth: '380px',
                },
                success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
                error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
              }}
            />
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
