import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Package, FileText,
  TrendingUp, AlertTriangle, Calendar, Clock,
  ArrowUpRight, AlertOctagon, Layers
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from 'recharts';
import { dashboardApi } from '../../api';
import { useAuth } from '../../context/AppContext';
import { format } from 'date-fns';
import type { DashboardSummary, ChallanStatus, StockStatus } from '../../types';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#f43f5e'];

const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  link?: string;
  change?: string;
}> = ({ label, value, icon, color, link, change }) => {
  const content = (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: `${color}20`, color, borderColor: `${color}40` }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px' }}>{value}</div>
        {change && <div style={{ fontSize: 12, color: '#34d399', fontWeight: 600, marginTop: 2 }}>{change}</div>}
      </div>
      {link && <ArrowUpRight size={18} style={{ color: '#64748b' }} />}
    </div>
  );
  if (link) return <Link to={link} style={{ textDecoration: 'none' }}>{content}</Link>;
  return content;
};

const ChallanStatusBadge: React.FC<{ status: ChallanStatus }> = ({ status }) => (
  <span className={`badge badge-${status.toLowerCase()}`}>{status}</span>
);

const StockStatusBadge: React.FC<{ status: StockStatus }> = ({ status }) => (
  <span className={`badge badge-${status.toLowerCase()}`}>{status}</span>
);

const SkeletonCard = () => (
  <div className="stat-card">
    <div className="skeleton" style={{ width: 52, height: 52, borderRadius: 16 }} />
    <div style={{ flex: 1 }}>
      <div className="skeleton" style={{ height: 12, width: '60%', marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 26, width: '40%' }} />
    </div>
  </div>
);

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.summary(),
    select: (res) => res.data.data as DashboardSummary,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Loading operational metrics...</p>
          </div>
        </div>
        <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
          {Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (!data) return null;
  const { overview, inventory, charts, recent } = data;

  const customerTypeData = charts.customerTypes.map((ct) => ({
    name: ct.type,
    value: ct.count,
  }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="page-subtitle">{format(new Date(), 'EEEE, dd MMMM yyyy')} · {user?.role} Operations Command Center</p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        <StatCard label="Total Customers" value={overview.totalCustomers} icon={<Users size={22} />} color="#6366f1" link="/customers" />
        <StatCard label="Total Products" value={overview.totalProducts} icon={<Package size={22} />} color="#10b981" link="/products" />
        <StatCard label="Total Challans" value={overview.totalChallans} icon={<FileText size={22} />} color="#818cf8" link="/challans" />
        <StatCard label="Inventory Value" value={`₹${(overview.totalInventoryValue / 100000).toFixed(1)}L`} icon={<TrendingUp size={22} />} color="#f59e0b" />
        <StatCard label="Low Stock Items" value={overview.lowStockCount} icon={<AlertTriangle size={22} />} color="#fbbf24" link="/inventory" />
        <StatCard label="Critical Stock" value={overview.criticalStockCount} icon={<AlertOctagon size={22} />} color="#f43f5e" link="/inventory" />
        <StatCard label="Pending Follow-ups" value={overview.pendingFollowUps} icon={<Calendar size={22} />} color="#a855f7" link="/customers" />
        <StatCard label="Overdue Follow-ups" value={overview.overdueFollowUps} icon={<Clock size={22} />} color="#f43f5e" link="/customers" />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* Inventory Health */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Layers size={20} color="#818cf8" /> Inventory Health Status
              </h3>
              <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>Real-time stock level breakdown</p>
            </div>
            <Link to="/inventory" className="btn btn-ghost btn-sm">View Inventory</Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Healthy', value: inventory.healthy, color: '#34d399', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.25)' },
              { label: 'Low Stock', value: inventory.lowStock, color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.25)' },
              { label: 'Critical', value: inventory.critical, color: '#fb7185', bg: 'rgba(244, 63, 94, 0.12)', border: 'rgba(244, 63, 94, 0.25)' },
            ].map((item) => (
              <div key={item.label} style={{ background: item.bg, border: `1px solid ${item.border}`, borderRadius: 16, padding: '18px', textAlign: 'center', backdropFilter: 'blur(8px)' }}>
                <div style={{ fontSize: 30, fontWeight: 800, color: item.color }}>{item.value}</div>
                <div style={{ fontSize: 12, color: item.color, fontWeight: 700, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
              </div>
            ))}
          </div>

          {inventory.criticalProducts.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Critical Products Requiring Reorder
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {inventory.criticalProducts.slice(0, 4).map((p) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.2)', borderRadius: 14 }}>
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover', border: '1px solid rgba(244, 63, 94, 0.3)' }} />
                    ) : (
                      <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(244, 63, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <AlertOctagon size={22} color="#fb7185" />
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <Link to={`/products/${p.id}`} style={{ fontWeight: 700, fontSize: 14, color: '#f8fafc', textDecoration: 'none' }}>
                        {p.name}
                      </Link>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{p.sku} · {p.warehouseLocation || 'Main Hub'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 17, fontWeight: 800, color: '#fb7185' }}>{p.currentStock}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>min: {p.minimumStock}</div>
                    </div>
                    <StockStatusBadge status="CRITICAL" />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Customer Distribution */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#f8fafc' }}>Customer Types</h3>
          </div>
          {customerTypeData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={customerTypeData} cx="50%" cy="50%" innerRadius={48} outerRadius={75} dataKey="value">
                    {customerTypeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {customerTypeData.map((item, index) => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[index] }} />
                    <span style={{ fontSize: 13, color: '#94a3b8', flex: 1, fontWeight: 500 }}>{item.name}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#f8fafc' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <p>No customer data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* Recent Challans */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#f8fafc' }}>Recent Sales Challans</h3>
            <Link to="/challans" className="btn btn-ghost btn-sm">View All</Link>
          </div>
          {recent.challans.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}><p>No challans created yet</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {recent.challans.map((challan) => (
                <Link key={challan.id} to={`/challans/${challan.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText size={19} color="#818cf8" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#f8fafc', fontFamily: "'JetBrains Mono', monospace" }}>{challan.challanNumber}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{challan.customer?.name}</div>
                  </div>
                  <ChallanStatusBadge status={challan.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Stock Movements */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#f8fafc' }}>Live Stock Movements</h3>
            <Link to="/inventory" className="btn btn-ghost btn-sm">View Log</Link>
          </div>
          {recent.stockMovements.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}><p>No stock movements logged</p></div>
          ) : (
            <div>
              {recent.stockMovements.map((mv) => (
                <div key={mv.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', gap: 12 }}>
                  {mv.product?.imageUrl ? (
                    <img src={mv.product.imageUrl} alt={mv.product?.name} style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', border: '1px solid rgba(255, 255, 255, 0.1)' }} />
                  ) : (
                    <div style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: mv.movementType === 'IN' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
                      border: `1px solid ${mv.movementType === 'IN' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 15, flexShrink: 0,
                      color: mv.movementType === 'IN' ? '#34d399' : '#fb7185'
                    }}>
                      {mv.movementType === 'IN' ? '+' : '-'}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#f8fafc' }}>{mv.product?.name}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{mv.user?.name} · {mv.reason}</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: mv.movementType === 'IN' ? '#34d399' : '#fb7185' }}>
                    {mv.movementType === 'IN' ? '+' : '-'}{mv.quantity}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
