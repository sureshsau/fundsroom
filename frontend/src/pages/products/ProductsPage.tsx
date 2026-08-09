import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Package, Eye, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { productsApi, stockTypesApi } from '../../api';
import { useAuth } from '../../context/AppContext';
import type { Product, StockStatus, StockType } from '../../types';
import { ProductFormModal } from './ProductFormModal';
import toast from 'react-hot-toast';

const StockStatusBadge: React.FC<{ status: StockStatus }> = ({ status }) => (
  <span className={`badge badge-${status.toLowerCase()}`}>{status}</span>
);

export const ProductsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [stockTypeId, setStockTypeId] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const canCreate = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE';

  // Fetch dynamic stock types
  const { data: stockTypesData } = useQuery({
    queryKey: ['stockTypes'],
    queryFn: () => stockTypesApi.list(),
    select: (res) => res.data.data as StockType[],
  });

  const stockTypes = stockTypesData || [];

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search, stockTypeId, lowStockOnly],
    queryFn: () =>
      productsApi.list({
        page,
        limit: 15,
        search: search || undefined,
        stockTypeId: stockTypeId || undefined,
        lowStock: lowStockOnly || undefined,
      }),
    select: (res) => res.data.data,
  });

  const products: Product[] = data?.data || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Products & Stock Catalog</h1>
          <p className="page-subtitle">{data?.total || 0} total physical stock items in system</p>
        </div>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Add Stock Item
          </button>
        )}
      </div>

      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={16} />
          <input
            className="form-input search-input"
            placeholder="Search by stock item name or SKU..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {/* Dynamic Stock Type Filter */}
        <select
          className="form-select"
          style={{ width: 190 }}
          value={stockTypeId}
          onChange={e => { setStockTypeId(e.target.value); setPage(1); }}
        >
          <option value="">All Stock Types</option>
          {stockTypes.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        <label style={{
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
          padding: '10px 14px', border: lowStockOnly ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 12, background: lowStockOnly ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.03)',
          color: lowStockOnly ? '#fbbf24' : '#94a3b8', fontWeight: 600
        }}>
          <input type="checkbox" checked={lowStockOnly} onChange={e => { setLowStockOnly(e.target.checked); setPage(1); }} />
          <AlertTriangle size={15} color="#fbbf24" /> Low Stock Alerts
        </label>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {isLoading ? (
          <div style={{ padding: '2rem' }}>
            {Array(5).fill(0).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
                <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 10 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ height: 14, width: '40%', marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 12, width: '25%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <Package size={44} />
            <h3>No stock items found</h3>
            <p>{search ? 'Try adjusting your search terms' : 'Add your first stock item to catalog'}</p>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item Thumbnail</th>
                  <th>Stock Name</th>
                  <th>SKU Code</th>
                  <th>Stock Type</th>
                  <th>Unit Price</th>
                  <th>Available Stock</th>
                  <th>Min Alert</th>
                  <th>Status</th>
                  <th>Warehouse Hub</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td style={{ width: 60, whiteSpace: 'nowrap' }}>
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                        />
                      ) : (
                        <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                          <ImageIcon size={20} />
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: 14, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}><code style={{ fontSize: 12, background: 'rgba(99, 102, 241, 0.12)', color: '#818cf8', padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(99, 102, 241, 0.2)' }}>{p.sku}</code></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className="badge" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#94a3b8', fontWeight: 600, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        {p.stockType?.name || p.category || 'Standard'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap' }}>₹{Number(p.unitPrice).toLocaleString('en-IN')}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 800, color: p.stockStatus === 'CRITICAL' ? '#fb7185' : p.stockStatus === 'LOW' ? '#fbbf24' : '#34d399', fontSize: 15 }}>
                        {p.currentStock}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: '#64748b', whiteSpace: 'nowrap' }}>{p.minimumStock}</td>
                    <td style={{ whiteSpace: 'nowrap' }}><StockStatusBadge status={p.stockStatus} /></td>
                    <td style={{ fontSize: 13, color: '#94a3b8', whiteSpace: 'nowrap' }}>{p.warehouseLocation || 'Main Hub'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/products/${p.id}`)}>
                        <Eye size={15} /> View Item
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <ProductFormModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Stock item added!'); }}
        />
      )}
    </div>
  );
};
