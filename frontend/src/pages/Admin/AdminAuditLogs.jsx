import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { ShieldCheck, FileText, Clock, RefreshCw, User, Terminal } from 'lucide-react';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminAuditLogs();
      if (res?.logs) setLogs(res.logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan/15 text-cyan border border-cyan/30 text-xs font-mono mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan" /> Security & Compliance Trail
          </div>
          <h1 className="font-heading text-2xl font-bold text-primary">
            ADMIN <span className="text-cyan">AUDIT LOGS</span>
          </h1>
          <p className="text-xs text-muted">
            Immutable log of all administrative actions, deposit approvals, payouts, parameter updates, and manual adjustments.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="btn-outline-cyan text-xs py-2 px-4 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Logs
        </button>
      </div>

      {/* Logs Table */}
      <div className="glass-card p-6">
        {logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="vault-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Action</th>
                  <th>Target Type</th>
                  <th>Target ID</th>
                  <th>Actor Email</th>
                  <th>Details & Reason</th>
                  <th>IP Address</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td className="font-mono text-xs text-muted">#{log.id}</td>
                    <td>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-cyan/15 text-cyan font-mono font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="font-mono text-xs text-muted uppercase">
                      {log.targetType}
                    </td>
                    <td className="font-mono text-xs text-primary font-bold">
                      #{log.targetId || '—'}
                    </td>
                    <td className="text-xs text-secondary font-mono">
                      {log.actorEmail}
                    </td>
                    <td className="text-xs text-primary max-w-sm truncate" title={log.details}>
                      {log.details}
                    </td>
                    <td className="font-mono text-xs text-muted">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                    <td className="text-xs text-muted font-mono whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-muted">
            No audit records recorded yet.
          </div>
        )}
      </div>

    </div>
  );
}
