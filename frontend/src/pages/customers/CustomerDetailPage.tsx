import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit, Plus, Phone, Mail, MapPin,
  Calendar, FileText, CheckCircle, AlertCircle, Clock
} from 'lucide-react';
import { customersApi, followupsApi } from '../../api';
import { useAuth } from '../../context/AppContext';
import type { Customer, FollowUp, ChallanStatus, CustomerStatus, CustomerType } from '../../types';
import toast from 'react-hot-toast';
import { CustomerFormModal } from './CustomerFormModal';
import { format, formatDistanceToNow } from 'date-fns';

const StatusBadge: React.FC<{ status: CustomerStatus }> = ({ status }) => (
  <span className={`badge badge-${status.toLowerCase()}`}>{status}</span>
);

const ChallanStatusBadge: React.FC<{ status: ChallanStatus }> = ({ status }) => (
  <span className={`badge badge-${status.toLowerCase()}`}>{status}</span>
);

const FollowUpCategoryBadge: React.FC<{ category?: string }> = ({ category }) => {
  if (!category) return null;
  return <span className={`badge badge-${category.toLowerCase().replace('_', '_')}`}>{category.replace('_', ' ')}</span>;
};

export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'challans' | 'followups'>('overview');

  const canEdit = user?.role === 'ADMIN' || user?.role === 'SALES';

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.get(id!),
    select: (res) => res.data.data as Customer & { followUps: FollowUp[]; challans: unknown[] },
    enabled: !!id,
  });

  const createFollowUpMutation = useMutation({
    mutationFn: () => customersApi.createFollowUp(id!, { followUpDate, notes: followUpNotes }),
    onSuccess: () => {
      toast.success('Follow-up created!');
      qc.invalidateQueries({ queryKey: ['customer', id] });
      setShowFollowUpForm(false);
      setFollowUpDate('');
      setFollowUpNotes('');
    },
  });

  const completeFollowUpMutation = useMutation({
    mutationFn: (fuId: string) => followupsApi.complete(fuId),
    onSuccess: () => {
      toast.success('Follow-up completed!');
      qc.invalidateQueries({ queryKey: ['customer', id] });
    },
  });

  if (isLoading) return (
    <div>
      <div style={{ height: 32, width: 200, marginBottom: 20 }} className="skeleton" />
      <div style={{ height: 200, borderRadius: 12 }} className="skeleton" />
    </div>
  );

  if (!customer) return <div>Customer not found</div>;

  const challans = (customer as { challans?: { id: string; challanNumber: string; status: ChallanStatus; totalQuantity: number; createdAt: string; creator?: { name: string } }[] }).challans || [];
  const followUps = customer.followUps || [];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('/customers')}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">{customer.name}</h1>
            {customer.businessName && <p className="page-subtitle">{customer.businessName}</p>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canEdit && (
            <button className="btn btn-secondary" onClick={() => setShowEditModal(true)}>
              <Edit size={16} /> Edit
            </button>
          )}
          {canEdit && (
            <button className="btn btn-primary" onClick={() => setShowFollowUpForm(true)}>
              <Plus size={16} /> Add Follow-up
            </button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Phone size={16} color="#3b82f6" />
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Mobile</span>
          </div>
          <div style={{ fontWeight: 600, color: '#1e293b' }}>{customer.mobile}</div>
        </div>
        {customer.email && (
          <div className="card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Mail size={16} color="#3b82f6" />
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Email</span>
            </div>
            <div style={{ fontWeight: 600, color: '#1e293b', wordBreak: 'break-all' }}>{customer.email}</div>
          </div>
        )}
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 8 }}>Status & Type</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <StatusBadge status={customer.status} />
            <span className={`badge badge-${customer.customerType.toLowerCase()}`}>{customer.customerType}</span>
          </div>
        </div>
        {customer.gstNumber && (
          <div className="card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 8 }}>GST Number</div>
            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>{customer.gstNumber}</div>
          </div>
        )}
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 8 }}>Total Challans</div>
          <div style={{ fontWeight: 700, fontSize: 22, color: '#1e293b' }}>{challans.length}</div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 8 }}>Customer Since</div>
          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>{format(new Date(customer.createdAt), 'dd MMM yyyy')}</div>
        </div>
      </div>

      {customer.address && (
        <div className="card" style={{ marginBottom: '1rem', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <MapPin size={16} color="#64748b" style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 4 }}>Address</div>
            <div style={{ fontSize: 14, color: '#1e293b' }}>{customer.address}</div>
          </div>
        </div>
      )}

      {customer.notes && (
        <div className="card" style={{ marginBottom: '1rem', background: '#fffbeb', borderColor: '#fde68a' }}>
          <div style={{ fontSize: 12, color: '#92400e', fontWeight: 600, marginBottom: 6 }}>📝 Notes</div>
          <div style={{ fontSize: 14, color: '#78350f' }}>{customer.notes}</div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: 0 }}>
        {(['overview', 'challans', 'followups'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 500,
              color: activeTab === tab ? '#2563eb' : '#64748b',
              borderBottom: activeTab === tab ? '2px solid #2563eb' : '2px solid transparent',
              marginBottom: -2,
              transition: 'all 0.15s',
              textTransform: 'capitalize'
            }}
          >
            {tab === 'overview' ? '📊 Overview' : tab === 'challans' ? `📋 Challans (${challans.length})` : `📅 Follow-ups (${followUps.length})`}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'challans' && (
        <div className="card" style={{ padding: 0 }}>
          {challans.length === 0 ? (
            <div className="empty-state"><FileText size={40} /><h3>No challans yet</h3><p>No sales challans have been created for this customer.</p></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Challan No.</th>
                  <th>Status</th>
                  <th>Qty</th>
                  <th>Created By</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {challans.map((ch: { id: string; challanNumber: string; status: ChallanStatus; totalQuantity: number; createdAt: string; creator?: { name: string } }) => (
                  <tr key={ch.id}>
                    <td><span style={{ fontWeight: 600, color: '#1e293b' }}>{ch.challanNumber}</span></td>
                    <td><ChallanStatusBadge status={ch.status} /></td>
                    <td>{ch.totalQuantity}</td>
                    <td style={{ fontSize: 13, color: '#475569' }}>{ch.creator?.name}</td>
                    <td style={{ fontSize: 13, color: '#64748b' }}>{format(new Date(ch.createdAt), 'dd MMM yyyy')}</td>
                    <td><Link to={`/challans/${ch.id}`} className="btn btn-ghost btn-sm">View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'followups' && (
        <div>
          {showFollowUpForm && (
            <div className="card" style={{ marginBottom: '1rem', background: '#eff6ff', borderColor: '#bfdbfe' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: '1rem', color: '#1e3a5f' }}>New Follow-up</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label required">Follow-up Date</label>
                  <input type="date" className="form-input" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Notes</label>
                  <input className="form-input" value={followUpNotes} onChange={e => setFollowUpNotes(e.target.value)} placeholder="Notes about this follow-up..." />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: '1rem' }}>
                <button className="btn btn-primary btn-sm" disabled={!followUpDate || createFollowUpMutation.isPending} onClick={() => createFollowUpMutation.mutate()}>
                  {createFollowUpMutation.isPending ? 'Creating...' : 'Create Follow-up'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowFollowUpForm(false)}>Cancel</button>
              </div>
            </div>
          )}

          {followUps.length === 0 ? (
            <div className="card">
              <div className="empty-state"><Calendar size={40} /><h3>No follow-ups</h3><p>Add a follow-up to track this customer.</p></div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {followUps.map((fu) => {
                const fuDate = new Date(fu.followUpDate);
                const now = new Date();
                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const category = fuDate < todayStart ? 'OVERDUE' : fuDate.toDateString() === now.toDateString() ? 'DUE_TODAY' : 'UPCOMING';

                return (
                  <div key={fu.id} className="card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                        background: category === 'OVERDUE' ? '#fee2e2' : category === 'DUE_TODAY' ? '#fef3c7' : '#eff6ff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: category === 'OVERDUE' ? '#dc2626' : category === 'DUE_TODAY' ? '#d97706' : '#2563eb'
                      }}>
                        {category === 'OVERDUE' ? <AlertCircle size={18} /> : category === 'DUE_TODAY' ? <Clock size={18} /> : <Calendar size={18} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
                            {format(fuDate, 'dd MMMM yyyy')}
                          </span>
                          <FollowUpCategoryBadge category={category} />
                          <span className={`badge badge-${fu.status.toLowerCase()}`}>{fu.status}</span>
                        </div>
                        {fu.notes && <p style={{ fontSize: 13, color: '#475569', margin: '4px 0' }}>{fu.notes}</p>}
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                          By {fu.user?.name} · {formatDistanceToNow(new Date(fu.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                      {fu.status === 'PENDING' && canEdit && (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => completeFollowUpMutation.mutate(fu.id)}
                          disabled={completeFollowUpMutation.isPending}
                        >
                          <CheckCircle size={14} /> Complete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: '1rem', color: '#1e293b' }}>Summary</h3>
            {[
              { label: 'Total Challans', value: challans.length },
              { label: 'Confirmed Challans', value: challans.filter((c: { status: ChallanStatus }) => c.status === 'CONFIRMED').length },
              { label: 'Pending Follow-ups', value: followUps.filter(f => f.status === 'PENDING').length },
              { label: 'Completed Follow-ups', value: followUps.filter(f => f.status === 'COMPLETED').length },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>{item.label}</span>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>{item.value}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: '1rem', color: '#1e293b' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link to={`/challans/create?customerId=${id}`} className="btn btn-primary" style={{ justifyContent: 'center' }}>
                <FileText size={16} /> Create Challan
              </Link>
              <button onClick={() => setShowFollowUpForm(true)} className="btn btn-secondary" style={{ justifyContent: 'center' }}>
                <Plus size={16} /> Add Follow-up
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <CustomerFormModal
          onClose={() => setShowEditModal(false)}
          customer={{ ...customer, id: customer.id } as Partial<{ name: string; mobile: string; email: string; businessName: string; gstNumber: string; customerType: CustomerType; address: string; status: CustomerStatus; followUpDate: string; notes: string }> & { id?: string }}
          onSuccess={() => { setShowEditModal(false); qc.invalidateQueries({ queryKey: ['customer', id] }); toast.success('Customer updated!'); }}
        />
      )}
    </div>
  );
};
