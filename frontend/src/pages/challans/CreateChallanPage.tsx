import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft, Plus, Trash2, AlertCircle, Search,
  User, Package, FileText, Save, Image as ImageIcon
} from 'lucide-react';
import { challansApi, customersApi, productsApi } from '../../api';
import type { Customer, Product } from '../../types';
import toast from 'react-hot-toast';

interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  unitPrice: number;
  currentStock: number;
  quantity: number;
  imageUrl?: string;
}

export const CreateChallanPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultCustomerId = searchParams.get('customerId') || '';

  const [customerId, setCustomerId] = useState(defaultCustomerId);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  const { data: customersData } = useQuery({
    queryKey: ['customers-all'],
    queryFn: () => customersApi.list({ limit: 100, status: 'ACTIVE' }),
    select: (res) => res.data.data.data as Customer[],
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-search', productSearch],
    queryFn: () => productsApi.list({ limit: 20, search: productSearch || undefined }),
    select: (res) => res.data.data.data as Product[],
    enabled: productSearch.length >= 1 || productSearch.length === 0,
  });

  const createMutation = useMutation({
    mutationFn: () => challansApi.create({
      customerId,
      items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
    }),
    onSuccess: (res) => {
      toast.success('Draft sales challan created!');
      navigate(`/challans/${res.data.data.id}`);
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to create challan');
    },
  });

  const addProduct = (product: Product) => {
    if (items.find(i => i.productId === product.id)) {
      toast.error('Product already added to order');
      return;
    }
    setItems(prev => [...prev, {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      unitPrice: Number(product.unitPrice),
      currentStock: product.currentStock,
      quantity: 1,
      imageUrl: product.imageUrl,
    }]);
    setProductSearch('');
  };

  const updateQty = (productId: string, qty: number) => {
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, quantity: Math.max(1, qty) } : i));
  };

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
  };

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const totalValue = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  const selectedCustomer = customersData?.find(c => c.id === customerId);
  const filteredCustomers = customersData?.filter(c =>
    customerSearch ? (c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.businessName?.toLowerCase().includes(customerSearch.toLowerCase())) : true
  ) || [];

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('/challans')}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">Create Sales Challan</h1>
            <p className="page-subtitle">Select customer profile and add physical stock items</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Customer Selection */}
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: '1rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={18} color="#818cf8" /> Customer Selection
            </h3>
            {selectedCustomer ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', background: 'rgba(99, 102, 241, 0.12)', borderRadius: 14, border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: 15 }}>{selectedCustomer.name}</div>
                  {selectedCustomer.businessName && <div style={{ fontSize: 13, color: '#818cf8', fontWeight: 600, marginTop: 2 }}>{selectedCustomer.businessName}</div>}
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{selectedCustomer.mobile}</div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => { setCustomerId(''); setCustomerSearch(''); }}>Change Customer</button>
              </div>
            ) : (
              <>
                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                  <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input className="form-input search-input" placeholder="Search customer by name or business..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} />
                </div>
                <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 12, background: 'rgba(15, 23, 42, 0.6)' }}>
                  {filteredCustomers.slice(0, 10).map(c => (
                    <div key={c.id} style={{ padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', transition: 'background 0.15s' }}
                      onClick={() => { setCustomerId(c.id); setCustomerSearch(''); }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#f8fafc' }}>{c.name}</div>
                      {c.businessName && <div style={{ fontSize: 12, color: '#818cf8', fontWeight: 600 }}>{c.businessName}</div>}
                    </div>
                  ))}
                  {filteredCustomers.length === 0 && <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>No matching customer profiles</div>}
                </div>
              </>
            )}
          </div>

          {/* Product Search & Add */}
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: '1rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Package size={18} color="#818cf8" /> Add Products
            </h3>
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                className="form-input search-input"
                placeholder="Search product by name or SKU code..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
              />
            </div>

            {productSearch && (
              <div style={{ border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 12, marginBottom: '1rem', maxHeight: 240, overflowY: 'auto', background: 'rgba(15, 23, 42, 0.6)' }}>
                {productsData?.filter(p => !items.find(i => i.productId === p.id)).map(p => (
                  <div key={p.id}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onClick={() => addProduct(p)}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', border: '1px solid rgba(255, 255, 255, 0.1)' }} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255, 255, 255, 0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                          <ImageIcon size={20} />
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#f8fafc' }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{p.sku} · Stock: {p.currentStock} · ₹{Number(p.unitPrice).toLocaleString('en-IN')}</div>
                      </div>
                    </div>
                    <button className="btn btn-primary btn-sm"><Plus size={14} /> Add</button>
                  </div>
                ))}
                {productsData?.length === 0 && <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>No products found</div>}
              </div>
            )}

            {/* Items List */}
            {items.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: '#64748b', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 14, border: '2px dashed rgba(255, 255, 255, 0.08)' }}>
                <Package size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>Search and select products above to add line items</p>
              </div>
            ) : (
              <div>
                {items.map((item) => (
                  <div key={item.productId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.productName} style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: '1px solid rgba(255, 255, 255, 0.1)' }} />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(255, 255, 255, 0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                        <ImageIcon size={20} />
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#f8fafc' }}>{item.productName}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>{item.sku} · ₹{item.unitPrice.toLocaleString('en-IN')} · Avail: {item.currentStock}</div>
                      {item.quantity > item.currentStock && (
                        <div style={{ fontSize: 11, color: '#fb7185', display: 'flex', gap: 4, alignItems: 'center', marginTop: 2, fontWeight: 600 }}>
                          <AlertCircle size={12} /> Quantity exceeds available stock
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', minWidth: 28 }} onClick={() => updateQty(item.productId, item.quantity - 1)}>-</button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={e => updateQty(item.productId, parseInt(e.target.value) || 1)}
                        style={{ width: 64, textAlign: 'center', padding: '6px 8px', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 10, fontSize: 14, fontWeight: 700, background: 'rgba(15, 23, 42, 0.8)', color: '#f8fafc' }}
                        min="1"
                      />
                      <button className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', minWidth: 28 }} onClick={() => updateQty(item.productId, item.quantity + 1)}>+</button>
                    </div>
                    <div style={{ fontWeight: 800, color: '#818cf8', minWidth: 85, textAlign: 'right', fontSize: 15, fontFamily: "'JetBrains Mono', monospace" }}>
                      ₹{(item.quantity * item.unitPrice).toLocaleString('en-IN')}
                    </div>
                    <button className="btn btn-danger btn-sm btn-icon" onClick={() => removeItem(item.productId)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Summary */}
        <div style={{ position: 'sticky', top: '5rem' }}>
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: '1rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={18} color="#818cf8" /> Order Summary
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <span style={{ color: '#94a3b8' }}>Customer</span>
                <span style={{ fontWeight: 700, color: selectedCustomer ? '#f8fafc' : '#64748b' }}>{selectedCustomer?.name || 'Not selected'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <span style={{ color: '#94a3b8' }}>Line Items</span>
                <span style={{ fontWeight: 700, color: '#f8fafc' }}>{items.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <span style={{ color: '#94a3b8' }}>Total Quantity</span>
                <span style={{ fontWeight: 800, fontSize: 15, color: '#f8fafc' }}>{totalQty}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, padding: '12px 0' }}>
                <span style={{ fontWeight: 700, color: '#f8fafc' }}>Total Value</span>
                <span style={{ fontWeight: 800, color: '#818cf8', fontFamily: "'JetBrains Mono', monospace", fontSize: 18 }}>₹{totalValue.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {!customerId && (
              <div style={{ fontSize: 12, color: '#fbbf24', display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12, padding: '10px 12px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 12, fontWeight: 600 }}>
                <AlertCircle size={14} /> Select a customer profile first
              </div>
            )}
            {items.length === 0 && (
              <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12, padding: '10px 12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 12, fontWeight: 600 }}>
                <AlertCircle size={14} /> Add at least one product line item
              </div>
            )}

            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15 }}
              disabled={!customerId || items.length === 0 || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              <Save size={18} />
              {createMutation.isPending ? 'Creating...' : 'Save as Draft'}
            </button>
            <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }} onClick={() => navigate('/challans')}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
