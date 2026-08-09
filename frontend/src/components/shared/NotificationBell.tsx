import React, { useState, useRef, useEffect } from 'react';
import {
  Bell, CheckCheck, ExternalLink,
  AlertTriangle, AlertOctagon, CheckCircle2, XCircle,
  Calendar, Clock, Package, User, FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../../api';
import { useNotifications } from '../../context/AppContext';
import type { Notification } from '../../types';
import { formatDistanceToNow } from 'date-fns';

const renderNotifIcon = (type: string) => {
  switch (type) {
    case 'LOW_STOCK':
      return <AlertTriangle size={18} color="#f59e0b" />;
    case 'CRITICAL_STOCK':
      return <AlertOctagon size={18} color="#f43f5e" />;
    case 'CHALLAN_CREATED':
      return <FileText size={18} color="#6366f1" />;
    case 'CHALLAN_CONFIRMED':
      return <CheckCircle2 size={18} color="#10b981" />;
    case 'CHALLAN_CANCELLED':
      return <XCircle size={18} color="#f43f5e" />;
    case 'FOLLOWUP_DUE':
      return <Calendar size={18} color="#8b5cf6" />;
    case 'FOLLOWUP_OVERDUE':
      return <Clock size={18} color="#f43f5e" />;
    case 'STOCK_RECEIVED':
      return <Package size={18} color="#10b981" />;
    case 'NEW_CUSTOMER':
      return <User size={18} color="#4f46e5" />;
    default:
      return <Bell size={18} color="#64748b" />;
  }
};

const entityNavMap: Record<string, string> = {
  PRODUCT: '/products',
  CHALLAN: '/challans',
  CUSTOMER: '/customers',
};

export const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { unreadCount, setUnreadCount, newNotification } = useNotifications();

  const { data, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list({ limit: 15 }),
    select: (res) => res.data.data,
  });

  useEffect(() => {
    if (newNotification) {
      refetch();
    }
  }, [newNotification, refetch]);

  useEffect(() => {
    if (data?.unreadCount !== undefined) {
      setUnreadCount(data.unreadCount);
    }
  }, [data?.unreadCount, setUnreadCount]);

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setUnreadCount(0);
    },
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNotifClick = (notif: Notification) => {
    if (!notif.isRead) {
      markReadMutation.mutate(notif.id);
    }
    if (notif.entityType && notif.entityId) {
      const base = entityNavMap[notif.entityType];
      if (base) {
        navigate(`${base}/${notif.entityId}`);
        setOpen(false);
      }
    }
  };

  const notifications: Notification[] = data?.data || [];

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        className="notif-bell-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Notifications</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {unreadCount > 0 && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => markAllReadMutation.mutate()}
                  title="Mark all read"
                >
                  <CheckCheck size={14} />
                  All read
                </button>
              )}
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { navigate('/notifications'); setOpen(false); }}
              >
                <ExternalLink size={14} />
              </button>
            </div>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <Bell size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notif-item ${!notif.isRead ? 'unread' : ''}`}
                  onClick={() => handleNotifClick(notif)}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {renderNotifIcon(notif.type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: notif.isRead ? 500 : 700, fontSize: 13, color: '#0f172a' }}>
                      {notif.title.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu, '').trim()}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }} className="truncate-2">
                      {notif.message}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                  {!notif.isRead && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4f46e5', flexShrink: 0, marginTop: 6 }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
