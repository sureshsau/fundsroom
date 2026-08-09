import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit, TrendingUp, TrendingDown, Image as ImageIcon,
  AlertTriangle, AlertOctagon, CheckCircle2, Activity
} from 'lucide-react';
import { productsApi } from '../../api';
import { useAuth } from '../../context/AppContext';
import type { Product, StockStatus } from '../../types';
import { ProductFormModal } from './ProductFormModal';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const StockStatusBadge: React.FC<{ status: StockStatus }> = ({ status }) => (
  <span className={`badge badge-${status.toLowerCase()}`}>{status}</span>
);

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);

  const canEdit = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE';

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.get(id!),
    select: (res) => res.data.data as Product & { stockMovements: unknown[] },
    enabled: !!id,
  });

  if (isLoading) return <div style={{ padding: 40 }}><div className="skeleton" style={{ height: 200 }} /></div>;
  if (!product) return <div>Stock item not found</div>;

  const movements = (product as { stockMovements?: { id: string; movementType: string; quantity: number; reason?: string; referenceType?: string; createdAt: string; user?: { name: string } }[] }).stockMovements || [];
  const totalValue = Number(product.unitPrice) * product.currentStock;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('/products')}>
            <ArrowLeft size={18} />
          </button>

          {/* Picture Thumbnail */}
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', border: '1px solid #e2e8f0' }}
            />
          ) : (
            <div style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              <ImageIcon size={24} />
            </div>
          )}

          <div>
            <h1 className="page-title">{product.name}</h1>
            <code style={{ fontSize: 13, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 4 }}>{product.sku}</code>
          </div>
        </div>
        {canEdit && (
          <button className="btn btn-secondary" onClick={() => setShowEditModal(true)}>
            <Edit size={16} /> Edit Stock Item
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Current Stock', value: product.currentStock, color: product.stockStatus === 'CRITICAL' ? '#f43f5e' : product.stockStatus === 'LOW' ? '#f59e0b' : '#10b981' },
          { label: 'Minimum Stock Alert', value: product.minimumStock, color: '#6366f1' },
          { label: 'Unit Price', value: `₹${Number(product.unitPrice).toLocaleString('en-IN')}`, color: '#4f46e5' },
          { label: 'Total Stock Value', value: `₹${totalValue.toLocaleString('en-IN')}`, color: '#10b981' },
        ].map((stat) => (
          <div key={stat.label} className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>{stat.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Details + Stock Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>Item Details</h3>
          {[
            { label: 'Dynamic Stock Type', value: product.stockType?.name || product.category || '—' },
            { label: 'Warehouse Location', value: product.warehouseLocation || '—' },
            { label: 'Stock Status', value: <StockStatusBadge status={product.stockStatus} /> },
            { label: 'Picture Storage', value: product.imageUrl ? 'Uploaded to Cloudinary' : 'No Picture' },
            { label: 'Added Date', value: format(new Date(product.createdAt), 'dd MMM yyyy') },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>{item.label}</span>
              <span style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{item.value}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>Stock Level Status</h3>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: '#64748b' }}>Current vs Minimum Threshold</span>
              <span style={{ fontWeight: 700 }}>{product.currentStock} / {product.minimumStock}</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(100, product.minimumStock > 0 ? (product.currentStock / product.minimumStock) * 100 : 100)}%`,
                  background: product.stockStatus === 'CRITICAL' ? '#f43f5e' : product.stockStatus === 'LOW' ? '#f59e0b' : '#10b981'
                }}
              />
            </div>
          </div>
          <div style={{
            padding: '14px',
            background: product.stockStatus === 'CRITICAL' ? '#fff1f2' : product.stockStatus === 'LOW' ? '#fffbeb' : '#ecfdf5',
            border: `1px solid ${product.stockStatus === 'CRITICAL' ? '#fecdd3' : product.stockStatus === 'LOW' ? '#fde68a' : '#a7f3d0'}`,
            borderRadius: 12
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: product.stockStatus === 'CRITICAL' ? '#be123c' : product.stockStatus === 'LOW' ? '#b45309' : '#047857', display: 'flex', alignItems: 'center', gap: 8 }}>
              {product.stockStatus === 'CRITICAL' ? (
                <><AlertOctagon size={18} /> Critical Stock Alert</>
              ) : product.stockStatus === 'LOW' ? (
                <><AlertTriangle size={18} /> Low Stock Alert</>
              ) : (
                <><CheckCircle2 size={18} /> Stock Level Healthy</>
              )}
            </div>
            <div style={{ fontSize: 12, marginTop: 4, color: '#475569' }}>
              {product.stockStatus === 'HEALTHY' ? 'Stock is well above minimum threshold' : 'Please reorder to avoid stockouts'}
            </div>
          </div>
        </div>
      </div>

      {/* Stock Movements */}
      <div className="card" style={{ padding: 0 }}>
        <div className="card-header" style={{ padding: '1.25rem 1.5rem' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={18} color="#4f46e5" /> Stock Movement History
          </h3>
        </div>
        {movements.length === 0 ? (
          <div className="empty-state"><p>No stock movements recorded</p></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Quantity</th>
                <th>Reason</th>
                <th>Reference</th>
                <th>By</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((mv: { id: string; movementType: string; quantity: number; reason?: string; referenceType?: string; createdAt: string; user?: { name: string } }) => (
                <tr key={mv.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {mv.movementType === 'IN' ? <TrendingUp size={16} color="#10b981" /> : <TrendingDown size={16} color="#f43f5e" />}
                      <span style={{ fontWeight: 700, color: mv.movementType === 'IN' ? '#047857' : '#be123c' }}>{mv.movementType}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 800, color: mv.movementType === 'IN' ? '#047857' : '#be123c' }}>
                      {mv.movementType === 'IN' ? '+' : '-'}{mv.quantity}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: '#475569' }}>{mv.reason || '—'}</td>
                  <td><span style={{ fontSize: 12, background: '#f1f5f9', padding: '2px 8px', borderRadius: 4 }}>{mv.referenceType || '—'}</span></td>
                  <td style={{ fontSize: 13, color: '#475569' }}>{mv.user?.name}</td>
                  <td style={{ fontSize: 13, color: '#64748b' }}>{format(new Date(mv.createdAt), 'dd MMM yyyy HH:mm')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showEditModal && (
        <ProductFormModal
          onClose={() => setShowEditModal(false)}
          product={{ ...product, id: product.id }}
          onSuccess={() => {
            setShowEditModal(false);
            qc.invalidateQueries({ queryKey: ['product', id] });
            toast.success('Stock item updated!');
          }}
        />
      )}
    </div>
  );
};
