import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, TrendingUp, TrendingDown, AlertOctagon,
  Package, CheckCircle2, ExternalLink, Layers
} from 'lucide-react';
import { inventoryApi, productsApi } from '../../api';
import { useAuth } from '../../context/AppContext';
import type { StockMovement, Product } from '../../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const renderReference = (mv: StockMovement) => {
  const refType = mv.referenceType || 'MANUAL';
  let label = refType;
  if (refType === 'SALES_CHALLAN') label = 'Sales Challan';
  else if (refType === 'CHALLAN_CANCELLATION') label = 'Challan Cancellation';
  else if (refType === 'MANUAL_ADJUSTMENT') label = 'Manual Adjustment';
  else if (refType === 'PURCHASE') label = 'Stock Purchase';

  if (mv.referenceId && (refType === 'SALES_CHALLAN' || refType === 'CHALLAN_CANCELLATION')) {
    return (
      <Link
        to={`/challans/${mv.referenceId}`}
        style={{
          fontSize: 12,
          fontFamily: "'JetBrains Mono', monospace",
          background: 'rgba(99, 102, 241, 0.15)',
          color: '#818cf8',
          padding: '4px 10px',
          borderRadius: 8,
          border: '1px solid rgba(99, 102, 241, 0.3)',
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontWeight: 600,
          transition: 'all 0.2s ease'
        }}
      >
        <span>{label}</span>
        <ExternalLink size={12} />
      </Link>
    );
  }

  return (
    <span style={{
      fontSize: 12,
      fontFamily: "'JetBrains Mono', monospace",
      background: 'rgba(255, 255, 255, 0.05)',
      color: '#94a3b8',
      padding: '4px 10px',
      borderRadius: 8,
      border: '1px solid rgba(255, 255, 255, 0.08)'
    }}>
      {label}
    </span>
  );
};

export const InventoryPage: React.FC = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showStockInForm, setShowStockInForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [page, setPage] = useState(1);
  const [productFilter, setProductFilter] = useState('');

  const canStockIn = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE';

  const { data: movementsData, isLoading: movementsLoading } = useQuery({
    queryKey: ['stockMovements', page, productFilter],
    queryFn: () => inventoryApi.movements({ page, limit: 20, productId: productFilter || undefined }),
    select: (res) => res.data.data,
  });

  const { data: summaryData } = useQuery({
    queryKey: ['inventorySummary'],
    queryFn: () => inventoryApi.summary(),
    select: (res) => res.data.data,
    refetchInterval: 30000,
  });

  const { data: allProducts } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => productsApi.list({ limit: 100 }),
    select: (res) => res.data.data.data as Product[],
  });

  const stockInMutation = useMutation({
    mutationFn: () => inventoryApi.stockIn({
      productId: selectedProduct,
      quantity: parseInt(quantity),
      reason: reason || 'Manual stock addition',
    }),
    onSuccess: () => {
      toast.success('Stock added successfully!');
      qc.invalidateQueries({ queryKey: ['stockMovements'] });
      qc.invalidateQueries({ queryKey: ['inventorySummary'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      setShowStockInForm(false);
      setSelectedProduct('');
      setQuantity('');
      setReason('');
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to add stock');
    },
  });

  const movements: StockMovement[] = movementsData?.data || [];
  const summary = summaryData;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory Management</h1>
          <p className="page-subtitle">Real-time stock movements and inventory audit log</p>
        </div>
        {canStockIn && (
          <button className="btn btn-primary" onClick={() => setShowStockInForm(true)}>
            <Plus size={16} /> Stock In
          </button>
        )}
      </div>

      {/* Summary Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
          {[
            { label: 'Total Products', value: summary.totalProducts, color: '#818cf8', bg: 'rgba(99, 102, 241, 0.12)', border: 'rgba(99, 102, 241, 0.25)' },
            { label: 'Healthy Stock', value: summary.healthy, color: '#34d399', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.25)' },
            { label: 'Low Stock', value: summary.lowStock, color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.25)' },
            { label: 'Critical Stock', value: summary.critical, color: '#fb7185', bg: 'rgba(244, 63, 94, 0.12)', border: 'rgba(244, 63, 94, 0.25)' },
            { label: 'Total Inventory Value', value: `₹${(summary.totalInventoryValue / 100000).toFixed(1)}L`, color: '#c084fc', bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.25)' },
          ].map((stat) => (
            <div key={stat.label} className="card" style={{ padding: '1.25rem', background: stat.bg, border: `1px solid ${stat.border}`, backdropFilter: 'blur(12px)' }}>
              <div style={{ fontSize: 11, color: stat.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>{stat.label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: stat.color, letterSpacing: '-0.5px' }}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Critical Stock Alert */}
      {summary && summary.critical > 0 && (
        <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.25)', borderRadius: 16, padding: '1.25rem', marginBottom: '1.75rem', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <AlertOctagon size={24} color="#fb7185" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 800, color: '#fb7185', marginBottom: 8, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
              {summary.critical} Product(s) in Critical Stock Attention Required
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {summary.criticalProducts?.map((p: Product) => (
                <Link key={p.id} to={`/products/${p.id}`} style={{ fontSize: 12, background: 'rgba(244, 63, 94, 0.2)', color: '#f8fafc', padding: '4px 12px', borderRadius: 9999, textDecoration: 'none', fontWeight: 600, border: '1px solid rgba(244, 63, 94, 0.3)' }}>
                  {p.name} ({p.currentStock} remaining)
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stock In Form */}
      {showStockInForm && (
        <div className="card" style={{ marginBottom: '1.75rem', background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.25)' }}>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: '#34d399', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Package size={20} color="#34d399" /> Add Physical Stock
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label required">Product</label>
              <select className="form-select" value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}>
                <option value="">Select product to restock...</option>
                {allProducts?.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} (Current Stock: {p.currentStock})</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label required">Quantity</label>
              <input type="number" className="form-input" value={quantity} onChange={e => setQuantity(e.target.value)} min="1" placeholder="50" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Reason / Supplier</label>
              <input className="form-input" value={reason} onChange={e => setReason(e.target.value)} placeholder="Purchase from supplier" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: '1.25rem' }}>
            <button
              className="btn btn-success"
              disabled={!selectedProduct || !quantity || stockInMutation.isPending}
              onClick={() => stockInMutation.mutate()}
            >
              <CheckCircle2 size={16} />
              {stockInMutation.isPending ? 'Adding Stock...' : 'Confirm Stock In'}
            </button>
            <button className="btn btn-secondary" onClick={() => setShowStockInForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Movements Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="card-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={19} color="#818cf8" /> Stock Movement Audit Log
          </h3>
          <select className="form-select" style={{ width: 220 }} value={productFilter} onChange={e => { setProductFilter(e.target.value); setPage(1); }}>
            <option value="">All Stock Items</option>
            {allProducts?.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {movementsLoading ? (
          <div style={{ padding: '2rem' }}>
            {Array(5).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 50, marginBottom: 8, borderRadius: 10 }} />)}
          </div>
        ) : movements.length === 0 ? (
          <div className="empty-state">
            <TrendingUp size={44} />
            <h3>No stock movements recorded</h3>
            <p>Stock additions and challan fulfillments will automatically log here</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Movement</th>
                <th>Stock Product</th>
                <th>Quantity</th>
                <th>Reason</th>
                <th>Reference</th>
                <th>Logged By</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((mv) => (
                <tr key={mv.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {mv.movementType === 'IN'
                        ? <TrendingUp size={16} color="#34d399" />
                        : <TrendingDown size={16} color="#fb7185" />}
                      <span className={`badge ${mv.movementType === 'IN' ? 'badge-confirmed' : 'badge-cancelled'}`}>
                        {mv.movementType}
                      </span>
                    </div>
                  </td>
                  <td>
                    <Link to={`/products/${mv.product?.id}`} style={{ fontWeight: 700, color: '#f8fafc', textDecoration: 'none' }}>
                      {mv.product?.name}
                    </Link>
                    <div style={{ fontSize: 12, color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{mv.product?.sku}</div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 800, color: mv.movementType === 'IN' ? '#34d399' : '#fb7185', fontSize: 15 }}>
                      {mv.movementType === 'IN' ? '+' : '-'}{mv.quantity}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: '#94a3b8' }}>{mv.reason || '—'}</td>
                  <td>{renderReference(mv)}</td>
                  <td style={{ fontSize: 13, color: '#94a3b8' }}>{mv.user?.name}</td>
                  <td style={{ fontSize: 12, color: '#64748b' }}>{format(new Date(mv.createdAt), 'dd MMM yyyy, HH:mm')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {(movementsData?.totalPages || 1) > 1 && (
          <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div className="pagination">
              <button className="pagination-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>←</button>
              <span style={{ padding: '0 12px', fontSize: 13, color: '#94a3b8' }}>Page {page} of {movementsData?.totalPages}</span>
              <button className="pagination-btn" disabled={page === movementsData?.totalPages} onClick={() => setPage(p => p + 1)}>→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
