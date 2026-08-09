import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Package, Warehouse, FileText,
  Bell, ClipboardList, Settings, LogOut, Menu, X,
  ChevronRight, ShieldCheck, TrendingUp
} from 'lucide-react';
import { useAuth } from '../../context/AppContext';
import { NotificationBell } from '../shared/NotificationBell';
import type { UserRole } from '../../types';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  roles?: UserRole[];
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/customers', icon: <Users size={18} />, label: 'Customers', roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] },
  { to: '/products', icon: <Package size={18} />, label: 'Products' },
  { to: '/inventory', icon: <Warehouse size={18} />, label: 'Inventory', roles: ['ADMIN', 'WAREHOUSE'] },
  { to: '/challans', icon: <FileText size={18} />, label: 'Sales Challans', roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] },
  { to: '/notifications', icon: <Bell size={18} />, label: 'Notifications' },
  { to: '/audit-logs', icon: <ClipboardList size={18} />, label: 'Audit Logs', roles: ['ADMIN'] },
  { to: '/users', icon: <ShieldCheck size={18} />, label: 'Users', roles: ['ADMIN'] },
  { to: '/settings', icon: <Settings size={18} />, label: 'Settings' },
];

interface SidebarContentProps {
  role: UserRole;
  onClose?: () => void;
}

const SidebarContent: React.FC<SidebarContentProps> = ({ role, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const filteredItems = navItems.filter((item) => !item.roles || item.roles.includes(role));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <TrendingUp size={22} color="white" />
        </div>
        <div>
          <div className="sidebar-logo-text">ERP Portal</div>
          <div className="sidebar-logo-sub">Operations Command</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-auto btn-ghost btn-icon btn p-1" style={{ color: '#94a3b8' }}>
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="sidebar-section">
        <div className="sidebar-section-label">Core Navigation</div>
        {filteredItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      {/* User Profile at bottom */}
      <div style={{ marginTop: 'auto', padding: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', padding: '8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 14, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
          }}>
            <span style={{ color: 'white', fontWeight: 800, fontSize: 14 }}>
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ color: '#f8fafc', fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name}
            </div>
            <div style={{ color: '#818cf8', fontSize: 11, fontWeight: 600 }}>{user?.role}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="sidebar-item"
          style={{ width: '100%', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', cursor: 'pointer', color: '#fb7185', justifyContent: 'center' }}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </>
  );
};

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="layout-container">
      {/* Desktop Sidebar */}
      <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
        <SidebarContent role={user.role} />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 39, backdropFilter: 'blur(4px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`sidebar ${sidebarOpen ? 'open' : ''}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          zIndex: 40,
        }}
      >
        <SidebarContent role={user.role} onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => setSidebarOpen(true)}
              style={{ display: 'none' }}
              id="mobile-menu-btn"
            >
              <Menu size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
              <ChevronRight size={16} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Notification Bell */}
            <NotificationBell />

            {/* User Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 12px 4px 6px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)'
              }}>
                <span style={{ color: 'white', fontWeight: 800, fontSize: 13 }}>
                  {user.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>{user.name}</div>
                <div style={{ fontSize: 11, color: '#818cf8', fontWeight: 600 }}>{user.role}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content">
          {children}
        </main>
      </div>

      {/* Mobile menu button */}
      <style>{`
        @media (max-width: 768px) {
          #mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
};
