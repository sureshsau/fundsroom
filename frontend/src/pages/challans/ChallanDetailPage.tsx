import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CheckCircle, XCircle, AlertCircle,
  User, FileText, Package, Image as ImageIcon, ArrowRight
} from 'lucide-react';
import { challansApi } from '../../api';
import { useAuth } from '../../context/AppContext';
import type { Challan, ChallanStatus } from '../../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const StatusBadge: React.FC<{ status: ChallanStatus }> = ({ status }) => (
  <span className={`badge badge-${status.toLowerCase()}`} style={{ fontSize: 13, padding: '4px 14px' }}>{status}</span>
);

export const ChallanDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [confirmDialog, setConfirmDialog] = useState<'confirm' | 'cancel' | null>(null);

  const canConfirm = ['ADMIN', 'SALES', 'WAREHOUSE'].includes(user?.role || '');
  const canCancel = ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'].includes(user?.role || '');

  const { data: challan, isLoading } = useQuery({
    queryKey: ['challan', id],
    queryFn: () => challansApi.get(id!),
    select: (res) => res.data.data as Challan,
    enabled: !!id,
  });

  const confirmMutation = useMutation({
    mutationFn: () => challansApi.confirm(id!),
    onSuccess: () => {
      toast.success('Challan confirmed! Stock has been deducted.');
      qc.invalidateQueries({ queryKey: ['challan', id] });
      setConfirmDialog(null);
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string; errorCode?: string; available?: number; requested?: number } } };
      const data = error.response?.data;
      if (data?.errorCode === 'INSUFFICIENT_STOCK') {
        toast.error(`Insufficient stock! Available: ${data.available}, Requested: ${data.requested}`);
      } else {
        toast.error(data?.message || 'Failed to confirm challan');
      }
      setConfirmDialog(null);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => challansApi.cancel(id!),
    onSuccess: () => {
      toast.success('Challan cancelled.');
      qc.invalidateQueries({ queryKey: ['challan', id] });
      setConfirmDialog(null);
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to cancel challan');
      setConfirmDialog(null);
    },
  });

  if (isLoading) return <div style={{ padding: 40 }}><div className="skeleton" style={{ height: 300 }} /></div>;
  if (!challan) return <div>Challan not found</div>;

  const totalValue = challan.items.reduce((s, i) => s + Number(i.totalPrice), 0);

  return (
    <div>
      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="modal-overlay" onClick={() => setConfirmDialog(null)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              {confirmDialog === 'confirm' ? (
                <>
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#ecfdf5', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                    <CheckCircle size={32} color="#10b981" />
                  </div>
                  <h3 style={{ fontSize: 19, fontWeight: 800, marginBottom: 8, color: '#0f172a' }}>Confirm Sales Challan?</h3>
                  <p style={{ fontSize: 14, color: '#64748b', marginBottom: '1.5rem' }}>
                    This will deduct <strong>{challan.totalQuantity} units</strong> from stock inventory. This action cannot be easily undone.
                  </p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <button className="btn btn-secondary" onClick={() => setConfirmDialog(null)}>Cancel</button>
                    <button className="btn btn-success" disabled={confirmMutation.isPending} onClick={() => confirmMutation.mutate()}>
                      <CheckCircle size={16} />
                      {confirmMutation.isPending ? 'Confirming...' : 'Yes, Confirm'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#fff1f2', border: '1px solid #fecdd3', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                    <XCircle size={32} color="#f43f5e" />
                  </div>
                  <h3 style={{ fontSize: 19, fontWeight: 800, marginBottom: 8, color: '#0f172a' }}>Cancel Sales Challan?</h3>
                  <p style={{ fontSize: 14, color: '#64748b', marginBottom: '1.5rem' }}>
                    {challan.status === 'CONFIRMED'
                      ? 'Stock will be restored to inventory.'
                      : 'This draft sales challan will be cancelled.'}
                  </p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <button className="btn btn-secondary" onClick={() => setConfirmDialog(null)}>Back</button>
                    <button className="btn btn-danger" disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate()}>
                      <XCircle size={16} />
                      {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Challan'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('/challans')}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 className="page-title" style={{ fontFamily: 'monospace' }}>{challan.challanNumber}</h1>
              <StatusBadge status={challan.status} />
            </div>
            <p className="page-subtitle">Created by {challan.creator?.name} · {format(new Date(challan.createdAt), 'dd MMMM yyyy, HH:mm')}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {challan.status === 'DRAFT' && canConfirm && (
            <button className="btn btn-success" onClick={() => setConfirmDialog('confirm')}>
              <CheckCircle size={16} /> Confirm Challan
            </button>
          )}
          {challan.status !== 'CANCELLED' && canCancel && (
            <button className="btn btn-danger" onClick={() => setConfirmDialog('cancel')}>
              <XCircle size={16} /> Cancel
            </button>
          )}
        </div>
      </div>

      {/* Insufficient Stock Warning */}
      {challan.status === 'DRAFT' && challan.items.some(item => {
        const prod = item.product;
        return prod && prod.currentStock < item.quantity;
      }) && (
        <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 14, padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', gap: 12, alignItems: 'center' }}>
          <AlertCircle size={22} color="#f43f5e" />
          <div>
            <div style={{ fontWeight: 700, color: '#be123c' }}>Insufficient Stock Warning</div>
            <div style={{ fontSize: 13, color: '#e11d48', marginTop: 2 }}>Some items have insufficient stock. Confirmation will fail unless stock is restocked.</div>
          </div>
        </div>
      )}

      {/* Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={18} color="#4f46e5" /> Customer Details
          </h3>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', marginBottom: 4 }}>{challan.customer?.name}</div>
          {challan.customer?.businessName && <div style={{ fontSize: 13, color: '#4f46e5', fontWeight: 600, marginBottom: 4 }}>{challan.customer.businessName}</div>}
          <div style={{ fontSize: 13, color: '#64748b' }}>{challan.customer?.mobile}</div>
          {challan.customer?.email && <div style={{ fontSize: 13, color: '#64748b' }}>{challan.customer.email}</div>}
          <Link to={`/customers/${challan.customerId}`} style={{ fontSize: 13, color: '#4f46e5', textDecoration: 'none', marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
            View Customer Profile <ArrowRight size={14} />
          </Link>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} color="#4f46e5" /> Sales Challan Summary
          </h3>
          {[
            { label: 'Challan Number', value: challan.challanNumber },
            { label: 'Status', value: <StatusBadge status={challan.status} /> },
            { label: 'Total Items', value: challan.items.length },
            { label: 'Total Quantity', value: challan.totalQuantity },
            { label: 'Total Value', value: `₹${totalValue.toLocaleString('en-IN')}` },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>{item.label}</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Items Table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Package size={18} color="#4f46e5" /> Challan Items
          </h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Product</th>
              <th>SKU</th>
              <th>Unit Price</th>
              <th>Quantity</th>
              <th>Total Price</th>
              {challan.status === 'DRAFT' && <th>Available</th>}
            </tr>
          </thead>
          <tbody>
            {challan.items.map((item, index) => {
              const insufficient = challan.status === 'DRAFT' && item.product && item.product.currentStock < item.quantity;
              return (
                <tr key={item.id} style={insufficient ? { background: '#fff1f2' } : {}}>
                  <td style={{ color: '#94a3b8', fontSize: 13 }}>{index + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {item.imageUrl || item.product?.imageUrl ? (
                        <img
                          src={item.imageUrl || item.product?.imageUrl}
                          alt={item.productName}
                          style={{ width: 42, height: 42, borderRadius: 8, objectFit: 'cover', border: '1px solid #e2e8f0' }}
                        />
                      ) : (
                        <div style={{ width: 42, height: 42, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                          <ImageIcon size={20} />
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.productName}</div>
                        {insufficient && (
                          <div style={{ fontSize: 11, color: '#f43f5e', display: 'flex', gap: 4, alignItems: 'center', marginTop: 2, fontWeight: 600 }}>
                            <AlertCircle size={12} /> Insufficient stock
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td><code style={{ fontSize: 12, background: '#f1f5f9', padding: '3px 8px', borderRadius: 6 }}>{item.sku}</code></td>
                  <td style={{ fontWeight: 600 }}>₹{Number(item.unitPrice).toLocaleString('en-IN')}</td>
                  <td style={{ fontWeight: 800, fontSize: 15 }}>{item.quantity}</td>
                  <td style={{ fontWeight: 800, color: '#4f46e5' }}>₹{Number(item.totalPrice).toLocaleString('en-IN')}</td>
                  {challan.status === 'DRAFT' && (
                    <td>
                      <span style={{ color: (item.product?.currentStock || 0) >= item.quantity ? '#10b981' : '#f43f5e', fontWeight: 700 }}>
                        {item.product?.currentStock ?? '—'}
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f8fafc' }}>
              <td colSpan={4} style={{ padding: '14px 16px', fontWeight: 800, color: '#0f172a' }}>TOTAL SUMMARY</td>
              <td style={{ padding: '14px 16px', fontWeight: 800, fontSize: 16 }}>{challan.totalQuantity}</td>
              <td style={{ padding: '14px 16px', fontWeight: 800, fontSize: 17, color: '#4f46e5' }}>₹{totalValue.toLocaleString('en-IN')}</td>
              {challan.status === 'DRAFT' && <td />}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
