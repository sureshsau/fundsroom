import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react';
import { auditApi } from '../../api';
import type { AuditLog } from '../../types';
import { format } from 'date-fns';

const actionColors: Record<string, string> = {
  LOGIN: '#34d399', LOGOUT: '#94a3b8',
  CREATE_CUSTOMER: '#818cf8', UPDATE_CUSTOMER: '#fbbf24', DELETE_CUSTOMER: '#fb7185',
  CREATE_PRODUCT: '#818cf8', UPDATE_PRODUCT: '#fbbf24',
  STOCK_IN: '#34d399', STOCK_OUT: '#fb7185',
  CREATE_CHALLAN: '#c084fc', CONFIRM_CHALLAN: '#34d399', CANCEL_CHALLAN: '#fb7185',
  CREATE_FOLLOWUP: '#818cf8', COMPLETE_FOLLOWUP: '#34d399',
  CREATE_USER: '#c084fc', UPDATE_USER: '#fbbf24',
};

export const AuditLogsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['auditLogs', page, actionFilter, entityTypeFilter, from, to],
    queryFn: () => auditApi.list({
      page, limit: 50,
      action: actionFilter || undefined,
      entityType: entityTypeFilter || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    select: (res) => res.data.data,
  });

  const logs: AuditLog[] = data?.data || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">System Audit Logs</h1>
          <p className="page-subtitle">Immutable security and operational activity log</p>
        </div>
      </div>

      <div className="filter-bar">
        <select className="form-select" style={{ width: 220 }} value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}>
          <option value="">All System Actions</option>
          {Object.keys(actionColors).map(action => <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>)}
        </select>
        <select className="form-select" style={{ width: 170 }} value={entityTypeFilter} onChange={e => { setEntityTypeFilter(e.target.value); setPage(1); }}>
          <option value="">All Entities</option>
          {['CUSTOMER', 'PRODUCT', 'CHALLAN', 'FOLLOWUP', 'USER'].map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <input type="date" className="form-input" style={{ width: 160 }} value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} placeholder="From date" />
        <input type="date" className="form-input" style={{ width: 160 }} value={to} onChange={e => { setTo(e.target.value); setPage(1); }} placeholder="To date" />
      </div>

      <div className="card" style={{ padding: 0 }}>
        {isLoading ? (
          <div style={{ padding: '2rem' }}>
            {Array(8).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 50, marginBottom: 8, borderRadius: 10 }} />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <ClipboardList size={44} />
            <h3>No audit logs found</h3>
            <p>System actions will be recorded here automatically</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Role</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Event Payload</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>
                    {format(new Date(log.createdAt), 'dd MMM HH:mm:ss')}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: '#f8fafc' }}>{log.user?.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{log.user?.email}</div>
                  </td>
                  <td>
                    <span className={`badge badge-${log.user?.role?.toLowerCase()}`}>{log.user?.role}</span>
                  </td>
                  <td>
                    <span style={{
                      fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8,
                      background: `${actionColors[log.action] || '#64748b'}20`,
                      color: actionColors[log.action] || '#94a3b8',
                      border: `1px solid ${actionColors[log.action] || '#64748b'}40`,
                      fontFamily: "'JetBrains Mono', monospace"
                    }}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>
                    {log.entityType && (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#f8fafc' }}>{log.entityType}</div>
                        {log.entityId && <div style={{ fontSize: 11, color: '#818cf8', fontFamily: "'JetBrains Mono', monospace" }}>{log.entityId.slice(0, 8)}...</div>}
                      </div>
                    )}
                  </td>
                  <td>
                    {log.newData && (
                      <details style={{ cursor: 'pointer' }}>
                        <summary style={{ fontSize: 11, color: '#818cf8', fontWeight: 600, listStyle: 'none' }}>View Data</summary>
                        <pre style={{ fontSize: 10, background: 'rgba(15, 23, 42, 0.9)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.2)', padding: 8, borderRadius: 8, marginTop: 4, maxWidth: 220, overflow: 'auto', fontFamily: "'JetBrains Mono', monospace" }}>
                          {JSON.stringify(log.newData, null, 2)}
                        </pre>
                      </details>
                    )}
                  </td>
                  <td style={{ fontSize: 11, color: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>{log.ipAddress || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
