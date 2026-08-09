import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Bell, Mail } from 'lucide-react';
import { notificationsApi } from '../../api';
import { useAuth } from '../../context/AppContext';
import toast from 'react-hot-toast';

interface Prefs {
  lowStockEmail: boolean; criticalStockEmail: boolean;
  challanEmail: boolean; followupEmail: boolean;
  lowStockSocket: boolean; criticalStockSocket: boolean;
  challanSocket: boolean; followupSocket: boolean;
}

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: prefs, isLoading } = useQuery({
    queryKey: ['notif-prefs'],
    queryFn: () => notificationsApi.getPreferences(),
    select: (res) => res.data.data as Prefs,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Prefs>) => notificationsApi.updatePreferences(data as Record<string, unknown>),
    onSuccess: () => {
      toast.success('Preferences saved!');
      qc.invalidateQueries({ queryKey: ['notif-prefs'] });
    },
  });

  const toggle = (key: keyof Prefs) => {
    if (!prefs) return;
    updateMutation.mutate({ ...prefs, [key]: !prefs[key] });
  };

  const Toggle: React.FC<{ prefKey: keyof Prefs; label: string }> = ({ prefKey, label }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
      <span style={{ fontSize: 14, color: '#f8fafc', fontWeight: 500 }}>{label}</span>
      <button
        onClick={() => toggle(prefKey)}
        disabled={updateMutation.isPending || isLoading}
        style={{
          width: 46, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
          background: prefs?.[prefKey] ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255, 255, 255, 0.12)',
          transition: 'background 0.2s ease', position: 'relative', padding: 0,
          boxShadow: prefs?.[prefKey] ? '0 0 12px rgba(99, 102, 241, 0.4)' : 'none'
        }}
      >
        <div style={{
          width: 20, height: 20, borderRadius: '50%', background: 'white',
          position: 'absolute', top: 3,
          left: prefs?.[prefKey] ? 23 : 3,
          transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }} />
      </button>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Account Settings</h1>
          <p className="page-subtitle">Manage your profile and notification preference controls</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Account Info */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Settings size={20} color="#818cf8" />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#f8fafc' }}>Account Profile</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1.5rem', padding: '16px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 14 }}>
            <div style={{
              width: 54, height: 54, borderRadius: 16,
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 800, fontSize: 22, flexShrink: 0,
              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)'
            }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#f8fafc' }}>{user?.name}</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>{user?.email}</div>
              <span className={`badge badge-${user?.role?.toLowerCase()}`} style={{ marginTop: 8, display: 'inline-block' }}>{user?.role}</span>
            </div>
          </div>

          <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
            <p>To change your account password, use the <strong>Forgot Password</strong> link on the sign in page.</p>
            <p style={{ marginTop: 8 }}>To change role permissions, contact your company administrator.</p>
          </div>
        </div>

        {/* Notification Preferences */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Email Notifications */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mail size={19} color="#fbbf24" />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>Email Alerts</h3>
                <p style={{ fontSize: 12, color: '#94a3b8' }}>Configure automated email notifications</p>
              </div>
            </div>

            {isLoading ? (
              <div>{Array(4).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 44, marginBottom: 8, borderRadius: 10 }} />)}</div>
            ) : (
              <>
                <Toggle prefKey="lowStockEmail" label="Low Stock Alerts" />
                <Toggle prefKey="criticalStockEmail" label="Critical Stock Alerts" />
                <Toggle prefKey="challanEmail" label="Sales Challan Confirmations" />
                <Toggle prefKey="followupEmail" label="Customer Follow-up Reminders" />
              </>
            )}
          </div>

          {/* In-App Notifications */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bell size={19} color="#818cf8" />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>In-App Notifications</h3>
                <p style={{ fontSize: 12, color: '#94a3b8' }}>Real-time Socket.IO alerts and bell popups</p>
              </div>
            </div>

            {isLoading ? (
              <div>{Array(4).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 44, marginBottom: 8, borderRadius: 10 }} />)}</div>
            ) : (
              <>
                <Toggle prefKey="lowStockSocket" label="Low Stock Alerts" />
                <Toggle prefKey="criticalStockSocket" label="Critical Stock Alerts" />
                <Toggle prefKey="challanSocket" label="Challan Draft & Confirmation Updates" />
                <Toggle prefKey="followupSocket" label="Customer Follow-up Reminders" />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
