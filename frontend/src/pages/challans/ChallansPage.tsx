import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FileText, Eye } from 'lucide-react';
import { challansApi } from '../../api';
import { useAuth } from '../../context/AppContext';
import type { Challan, ChallanStatus } from '../../types';
import { format } from 'date-fns';

const StatusBadge: React.FC<{ status: ChallanStatus }> = ({ status }) => (
  <span className={`badge badge-${status.toLowerCase()}`}>{status}</span>
);

export const ChallansPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const canCreate = ['ADMIN', 'SALES', 'WAREHOUSE'].includes(user?.role || '');

  const { data, isLoading } = useQuery({
    queryKey: ['challans', page, search, statusFilter],
    queryFn: () => challansApi.list({ page, limit: 15, search: search || undefined, status: statusFilter || undefined }),
    select: (res) => res.data.data,
  });

  const challans: Challan[] = data?.data || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales Challans</h1>
          <p className="page-subtitle">{data?.total || 0} total sales dispatch records</p>
        </div>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => navigate('/challans/create')}>
            <Plus size={16} /> Create Sales Challan
          </button>
        )}
      </div>

      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={16} />
          <input
            className="form-input search-input"
            placeholder="Search by challan number or customer name..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="form-select" style={{ width: 160 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {isLoading ? (
          <div style={{ padding: '2rem' }}>
            {Array(5).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 56, marginBottom: 8, borderRadius: 10 }} />)}
          </div>
        ) : challans.length === 0 ? (
          <div className="empty-state">
            <FileText size={44} />
            <h3>No sales challans found</h3>
            <p>{search ? 'Try adjusting your search query' : canCreate ? 'Create your first sales challan to get started' : 'No sales challans available'}</p>
            {canCreate && <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => navigate('/challans/create')}><Plus size={16} /> Create Sales Challan</button>}
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Challan No.</th>
                  <th>Customer Profile</th>
                  <th>Status</th>
                  <th>Line Items</th>
                  <th>Total Qty</th>
                  <th>Created By</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {challans.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span style={{ fontWeight: 700, color: '#f8fafc', fontFamily: "'JetBrains Mono', monospace", fontSize: 13.5 }}>{c.challanNumber}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: 14 }}>{c.customer?.name}</div>
                      {c.customer?.businessName && <div style={{ fontSize: 12, color: '#818cf8', fontWeight: 600, marginTop: 2 }}>{c.customer.businessName}</div>}
                    </td>
                    <td><StatusBadge status={c.status} /></td>
                    <td style={{ fontSize: 13, color: '#94a3b8' }}>{c.items?.length || 0} items</td>
                    <td style={{ fontWeight: 800, fontSize: 15, color: '#f8fafc' }}>{c.totalQuantity}</td>
                    <td style={{ fontSize: 13, color: '#94a3b8' }}>{c.creator?.name}</td>
                    <td style={{ fontSize: 12, color: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>{format(new Date(c.createdAt), 'dd MMM yyyy')}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/challans/${c.id}`)}>
                        <Eye size={15} /> View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(data?.totalPages || 1) > 1 && (
          <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div className="pagination">
              <button className="pagination-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>←</button>
              <span style={{ padding: '0 12px', fontSize: 13, color: '#94a3b8' }}>Page {page} of {data?.totalPages}</span>
              <button className="pagination-btn" disabled={page === data?.totalPages} onClick={() => setPage(p => p + 1)}>→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
