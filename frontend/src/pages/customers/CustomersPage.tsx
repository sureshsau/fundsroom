import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users, Eye } from 'lucide-react';
import { customersApi } from '../../api';
import { useAuth } from '../../context/AppContext';
import type { Customer, CustomerStatus, CustomerType } from '../../types';
import toast from 'react-hot-toast';
import { CustomerFormModal } from './CustomerFormModal';
import { format } from 'date-fns';

const StatusBadge: React.FC<{ status: CustomerStatus }> = ({ status }) => (
  <span className={`badge badge-${status.toLowerCase()}`}>{status}</span>
);

const TypeBadge: React.FC<{ type: CustomerType }> = ({ type }) => (
  <span className={`badge badge-${type.toLowerCase()}`}>{type}</span>
);

export const CustomersPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);

  const canCreate = user?.role === 'ADMIN' || user?.role === 'SALES';

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search, statusFilter, typeFilter],
    queryFn: () => customersApi.list({ page, limit: 15, search: search || undefined, status: statusFilter || undefined, type: typeFilter || undefined }),
    select: (res) => res.data.data,
  });

  const customers: Customer[] = data?.data || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer Directory</h1>
          <p className="page-subtitle">{data?.total || 0} total client & account profiles</p>
        </div>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Add Customer
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={16} />
          <input
            type="text"
            className="form-input search-input"
            placeholder="Search by customer name, mobile, business..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="form-select" style={{ width: 150 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="LEAD">Lead</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <select className="form-select" style={{ width: 170 }} value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}>
          <option value="">All Customer Types</option>
          <option value="RETAIL">Retail</option>
          <option value="WHOLESALE">Wholesale</option>
          <option value="DISTRIBUTOR">Distributor</option>
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {isLoading ? (
          <div style={{ padding: '2rem' }}>
            {Array(6).fill(0).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
                <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 10 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ height: 14, width: '40%', marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 12, width: '25%' }} />
                </div>
                <div className="skeleton" style={{ height: 24, width: 75, borderRadius: 9999 }} />
              </div>
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="empty-state">
            <Users size={44} />
            <h3>No customers found</h3>
            <p>{search ? 'Try adjusting your search criteria' : 'Add your first customer to get started'}</p>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer Profile</th>
                  <th>Contact Info</th>
                  <th>Account Type</th>
                  <th>Status</th>
                  <th>Follow-up Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: 14 }}>{c.name}</div>
                      {c.businessName && <div style={{ fontSize: 12, color: '#818cf8', fontWeight: 600, marginTop: 2 }}>{c.businessName}</div>}
                    </td>
                    <td>
                      <div style={{ fontSize: 13, color: '#f8fafc', fontFamily: "'JetBrains Mono', monospace" }}>{c.mobile}</div>
                      {c.email && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{c.email}</div>}
                    </td>
                    <td><TypeBadge type={c.customerType} /></td>
                    <td><StatusBadge status={c.status} /></td>
                    <td>
                      {c.followUpDate ? (
                        <span style={{
                          fontSize: 12,
                          fontFamily: "'JetBrains Mono', monospace",
                          color: new Date(c.followUpDate) < new Date() ? '#fb7185' : '#94a3b8',
                          fontWeight: 600
                        }}>
                          {format(new Date(c.followUpDate), 'dd MMM yyyy')}
                        </span>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: 13 }}>—</span>
                      )}
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/customers/${c.id}`)}>
                        <Eye size={15} /> View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div className="pagination">
              <button className="pagination-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>←</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                <button key={p} className={`pagination-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="pagination-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>→</button>
            </div>
          </div>
        )}
      </div>

      {showModal && <CustomerFormModal onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); qc.invalidateQueries({ queryKey: ['customers'] }); toast.success('Customer created!'); }} />}
    </div>
  );
};
