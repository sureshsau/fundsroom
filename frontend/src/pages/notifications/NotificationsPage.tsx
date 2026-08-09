import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell, Check, CheckCheck,
  AlertTriangle, AlertOctagon, FileText, CheckCircle2, XCircle,
  Calendar, Clock, Package, User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../../api';
import type { Notification } from '../../types';
import { format } from 'date-fns';

const renderNotifIcon = (type: string) => {
  switch (type) {
    case 'LOW_STOCK':
      return <AlertTriangle size={20} color="#fbbf24" />;
    case 'CRITICAL_STOCK':
      return <AlertOctagon size={20} color="#fb7185" />;
    case 'CHALLAN_CREATED':
      return <FileText size={20} color="#818cf8" />;
    case 'CHALLAN_CONFIRMED':
      return <CheckCircle2 size={20} color="#34d399" />;
    case 'CHALLAN_CANCELLED':
      return <XCircle size={20} color="#fb7185" />;
    case 'FOLLOWUP_DUE':
      return <Calendar size={20} color="#c084fc" />;
    case 'FOLLOWUP_OVERDUE':
      return <Clock size={20} color="#fb7185" />;
    case 'STOCK_RECEIVED':
      return <Package size={20} color="#34d399" />;
    case 'NEW_CUSTOMER':
      return <User size={20} color="#818cf8" />;
    default:
      return <Bell size={20} color="#94a3b8" />;
  }
};

const entityNavMap: Record<string, string> = {
  PRODUCT: '/products', CHALLAN: '/challans', CUSTOMER: '/customers',
};

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications-all'],
    queryFn: () => notificationsApi.list({ limit: 50 }),
    select: (res) => res.data.data,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications-all'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications-all'] }),
  });

  const notifications: Notification[] = data?.data || [];
  const unread = notifications.filter(n => !n.isRead).length;

  const handleClick = (notif: Notification) => {
    if (!notif.isRead) markReadMutation.mutate(notif.id);
    if (notif.entityType && notif.entityId) {
      const base = entityNavMap[notif.entityType];
      if (base) navigate(`${base}/${notif.entityId}`);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">{unread} unread · {notifications.length} total notifications</p>
        </div>
        {unread > 0 && (
          <button className="btn btn-secondary" onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending}>
            <CheckCheck size={16} /> Mark All Read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="card">
          {Array(5).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 72, marginBottom: 8, borderRadius: 12 }} />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Bell size={48} />
            <h3>No notifications</h3>
            <p>You're all caught up! Notifications will appear here when system events occur.</p>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`notif-item ${!notif.isRead ? 'unread' : ''}`}
              style={{ padding: '16px 20px' }}
              onClick={() => handleClick(notif)}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                {renderNotifIcon(notif.type)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontWeight: notif.isRead ? 500 : 700, fontSize: 14, color: '#f8fafc' }}>
                    {notif.title.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu, '').trim()}
                  </span>
                  {!notif.isRead && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 8px #6366f1' }} />}
                </div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>{notif.message}</div>
                <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span>{format(new Date(notif.createdAt), 'dd MMM yyyy, HH:mm')}</span>
                  {notif.entityType && (
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      background: 'rgba(99, 102, 241, 0.12)',
                      color: '#818cf8',
                      padding: '2px 8px',
                      borderRadius: 6,
                      border: '1px solid rgba(99, 102, 241, 0.2)'
                    }}>
                      {notif.entityType}
                    </span>
                  )}
                </div>
              </div>
              {!notif.isRead && (
                <button
                  className="btn btn-ghost btn-sm btn-icon"
                  onClick={e => { e.stopPropagation(); markReadMutation.mutate(notif.id); }}
                  title="Mark as read"
                >
                  <Check size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
