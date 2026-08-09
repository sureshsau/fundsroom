import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ShieldCheck, ToggleLeft, ToggleRight, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { usersApi } from '../../api';
import type { User } from '../../types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const createUserSchema = z.object({
  name: z.string().min(1, 'Name required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Min 8 characters'),
  role: z.enum(['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

const roleColors: Record<string, string> = {
  ADMIN: 'badge-admin', SALES: 'badge-sales',
  WAREHOUSE: 'badge-warehouse', ACCOUNTS: 'badge-accounts',
};

export const UsersPage: React.FC = () => {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
    select: (res) => res.data.data as User[],
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => usersApi.toggle(id),
    onSuccess: () => {
      toast.success('User status updated');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'SALES' },
  });

  const onSubmit = async (data: CreateUserForm) => {
    try {
      await usersApi.create(data as Record<string, unknown>);
      toast.success('User created successfully!');
      qc.invalidateQueries({ queryKey: ['users'] });
      setShowModal(false);
      reset();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to create user');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">{data?.length || 0} active users in team directory</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Team Member
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {isLoading ? (
          <div style={{ padding: '2rem' }}>
            {Array(4).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 56, marginBottom: 8, borderRadius: 10 }} />)}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Team Member</th>
                <th>Role</th>
                <th>Status</th>
                <th>Email Verification</th>
                <th>Joined Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data || []).map((user) => (
                <tr key={user.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 12,
                        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 800, fontSize: 14, flexShrink: 0,
                        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
                      }}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: 14 }}>{user.name}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className={`badge ${roleColors[user.role] || 'badge-admin'}`}>{user.role}</span></td>
                  <td>
                    <span className={`badge ${user.isActive ? 'badge-active' : 'badge-inactive'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: user.isEmailVerified ? '#34d399' : '#fbbf24' }}>
                      {user.isEmailVerified ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                      <span>{user.isEmailVerified ? 'Verified' : 'Pending'}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>{format(new Date(user.createdAt), 'dd MMM yyyy')}</td>
                  <td>
                    <button
                      className={`btn btn-sm ${user.isActive ? 'btn-danger' : 'btn-success'}`}
                      onClick={() => toggleMutation.mutate(user.id)}
                      disabled={toggleMutation.isPending}
                    >
                      {user.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={20} color="#818cf8" />
                </div>
                <h2 className="modal-title">Add Team Member</h2>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label required">Full Name</label>
                  <input {...register('name')} className={`form-input ${errors.name ? 'error' : ''}`} placeholder="Rahul Singh" />
                  {errors.name && <div className="form-error"><AlertCircle size={12} />{errors.name.message}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label required">Role</label>
                  <select {...register('role')} className="form-select">
                    <option value="SALES">Sales</option>
                    <option value="WAREHOUSE">Warehouse</option>
                    <option value="ACCOUNTS">Accounts</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label required">Email Address</label>
                <input {...register('email')} type="email" className={`form-input ${errors.email ? 'error' : ''}`} placeholder="rahul@company.com" />
                {errors.email && <div className="form-error"><AlertCircle size={12} />{errors.email.message}</div>}
              </div>

              <div className="form-group">
                <label className="form-label required">Initial Password</label>
                <input {...register('password')} type="password" className={`form-input ${errors.password ? 'error' : ''}`} placeholder="Min 8 characters" />
                {errors.password && <div className="form-error"><AlertCircle size={12} />{errors.password.message}</div>}
              </div>

              <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: 12, padding: '12px 14px', marginBottom: '1.25rem', fontSize: 12.5, color: '#818cf8', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
                <Sparkles size={16} color="#818cf8" />
                <span>User account will be created with pre-verified status and active access.</span>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                  {isSubmitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
