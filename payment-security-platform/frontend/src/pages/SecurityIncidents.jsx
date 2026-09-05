import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  Clock,
  User,
  Activity,
  FileText,
  Sliders,
} from 'lucide-react';
import { api } from '../services/api';
import './SecurityIncidents.css';

export default function SecurityIncidents() {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusSuccessMessage, setStatusSuccessMessage] = useState('');

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.getSecurityIncidents();
      const list = response.data || response.incidents || (Array.isArray(response) ? response : []);
      setIncidents(list);
      if (list.length > 0) {
        setSelectedIncident((prev) => {
          if (!prev) return list[0];
          const found = list.find((item) => (item.id || item.incidentId) === (prev.id || prev.incidentId));
          return found || list[0];
        });
      } else {
        setSelectedIncident(null);
      }
    } catch (err) {
      console.error('Failed to fetch security incidents:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load security incidents.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const handleStatusChange = async (newStatus) => {
    if (!selectedIncident) return;
    const incidentId = selectedIncident.id || selectedIncident.incidentId;
    if (!incidentId) return;

    setUpdatingStatus(true);
    setStatusSuccessMessage('');
    setError('');

    try {
      const response = await api.updateSecurityIncidentStatus(incidentId, newStatus);
      const updatedItem = response.data || response.incident || {
        ...selectedIncident,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };

      setSelectedIncident(updatedItem);
      setIncidents((prev) =>
        prev.map((item) => {
          const itemId = item.id || item.incidentId;
          return itemId === incidentId ? { ...item, ...updatedItem, status: newStatus } : item;
        })
      );
      setStatusSuccessMessage(`Incident status successfully updated to ${newStatus}.`);
    } catch (err) {
      console.error('Failed to update status:', err);
      setError(err.response?.data?.error || err.message || 'Failed to update incident status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const renderBadge = (type, value) => {
    const val = String(value || '').toUpperCase();
    let badgeClass = 'badge-default';

    if (type === 'severity') {
      if (val === 'CRITICAL') badgeClass = 'badge-critical';
      else if (val === 'HIGH') badgeClass = 'badge-high';
      else if (val === 'MEDIUM') badgeClass = 'badge-medium';
      else if (val === 'LOW') badgeClass = 'badge-low';
    } else if (type === 'status') {
      if (val === 'OPEN') badgeClass = 'badge-open';
      else if (val === 'INVESTIGATING') badgeClass = 'badge-investigating';
      else if (val === 'BLOCKED') badgeClass = 'badge-blocked';
      else if (val === 'RESOLVED') badgeClass = 'badge-resolved';
    }

    return <span className={`incident-badge ${badgeClass}`}>{val || 'N/A'}</span>;
  };

  const formatJson = (val) => {
    if (!val) return 'None';
    if (typeof val === 'object') {
      return JSON.stringify(val, null, 2);
    }
    try {
      const parsed = JSON.parse(val);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return String(val);
    }
  };

  return (
    <div className="security-incidents-container">
      <div className="incidents-header">
        <div className="header-title">
          <ShieldAlert className="title-icon" />
          <div>
            <h1>Security Incident Center</h1>
            <p className="subtitle">Real-time threat monitoring and incident response</p>
          </div>
        </div>
        <button className="refresh-btn" onClick={fetchIncidents} disabled={loading}>
          <RefreshCw className={`btn-icon ${loading ? 'spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="incidents-alert error-alert">
          <AlertTriangle className="alert-icon" />
          <span>{error}</span>
        </div>
      )}

      {statusSuccessMessage && (
        <div className="incidents-alert success-alert">
          <CheckCircle2 className="alert-icon" />
          <span>{statusSuccessMessage}</span>
        </div>
      )}

      {loading && incidents.length === 0 ? (
        <div className="incidents-state-card">
          <RefreshCw className="spin state-icon" />
          <p>Loading security incidents from SOC engine...</p>
        </div>
      ) : incidents.length === 0 ? (
        <div className="incidents-state-card">
          <Info className="state-icon" />
          <h3>No Security Incidents Found</h3>
          <p>No active security threats or violations detected.</p>
        </div>
      ) : (
        <div className="incidents-layout">
          {/* Table List View */}
          <div className="incidents-list-panel">
            <div className="panel-header">
              <h2>Incidents Log ({incidents.length})</h2>
            </div>
            <div className="table-wrapper">
              <table className="incidents-table">
                <thead>
                  <tr>
                    <th>Incident ID</th>
                    <th>Attack Type</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((item) => {
                    const id = item.id || item.incidentId;
                    const isSelected =
                      selectedIncident &&
                      (selectedIncident.id || selectedIncident.incidentId) === id;

                    return (
                      <tr
                        key={id}
                        className={isSelected ? 'selected-row' : ''}
                        onClick={() => {
                          setSelectedIncident(item);
                          setStatusSuccessMessage('');
                        }}
                      >
                        <td className="font-mono">{id}</td>
                        <td>{item.attackType || item.type || 'N/A'}</td>
                        <td>{renderBadge('severity', item.severity)}</td>
                        <td>{renderBadge('status', item.status)}</td>
                        <td className="text-muted">
                          {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Details Inspection Panel */}
          {selectedIncident && (
            <div className="incident-details-panel">
              <div className="panel-header">
                <h2>Incident Inspection</h2>
                <div className="status-selector">
                  <Sliders className="selector-icon" />
                  <select
                    value={selectedIncident.status || 'OPEN'}
                    disabled={updatingStatus}
                    onChange={(e) => handleStatusChange(e.target.value)}
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="INVESTIGATING">INVESTIGATING</option>
                    <option value="BLOCKED">BLOCKED</option>
                    <option value="RESOLVED">RESOLVED</option>
                  </select>
                </div>
              </div>

              <div className="details-body">
                <div className="meta-grid">
                  <div className="meta-card">
                    <span className="meta-label">Incident ID</span>
                    <span className="meta-value font-mono">
                      {selectedIncident.id || selectedIncident.incidentId}
                    </span>
                  </div>
                  <div className="meta-card">
                    <span className="meta-label">Attack Type</span>
                    <span className="meta-value">{selectedIncident.attackType || selectedIncident.type || 'N/A'}</span>
                  </div>
                  <div className="meta-card">
                    <span className="meta-label">Severity</span>
                    <div>{renderBadge('severity', selectedIncident.severity)}</div>
                  </div>
                  <div className="meta-card">
                    <span className="meta-label">Status</span>
                    <div>{renderBadge('status', selectedIncident.status)}</div>
                  </div>
                  <div className="meta-card">
                    <span className="meta-label">Test User</span>
                    <span className="meta-value">{selectedIncident.testUser || selectedIncident.senderUser || 'N/A'}</span>
                  </div>
                  <div className="meta-card">
                    <span className="meta-label">Target User</span>
                    <span className="meta-value">{selectedIncident.targetUser || selectedIncident.receiverUser || 'N/A'}</span>
                  </div>
                  <div className="meta-card">
                    <span className="meta-label">Transaction ID</span>
                    <span className="meta-value font-mono">
                      {selectedIncident.transactionId || selectedIncident.txId || 'N/A'}
                    </span>
                  </div>
                  <div className="meta-card">
                    <span className="meta-label">Security Decision</span>
                    <span className="meta-value highlight-decision">
                      {selectedIncident.securityDecision || selectedIncident.decision || 'N/A'}
                    </span>
                  </div>
                  <div className="meta-card">
                    <span className="meta-label">Created At</span>
                    <span className="meta-value">
                      {selectedIncident.createdAt ? new Date(selectedIncident.createdAt).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <div className="meta-card">
                    <span className="meta-label">Updated At</span>
                    <span className="meta-value">
                      {selectedIncident.updatedAt ? new Date(selectedIncident.updatedAt).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </div>

                {selectedIncident.expectedResult && (
                  <div className="info-block">
                    <h4>Expected Result</h4>
                    <p>{selectedIncident.expectedResult}</p>
                  </div>
                )}

                {selectedIncident.actualResult && (
                  <div className="info-block">
                    <h4>Actual Result</h4>
                    <p>{selectedIncident.actualResult}</p>
                  </div>
                )}

                <div className="payload-grid">
                  <div className="payload-block">
                    <h4>Original Request Payload</h4>
                    <pre className="json-box">
                      {formatJson(selectedIncident.originalRequest || selectedIncident.payload?.original)}
                    </pre>
                  </div>
                  <div className="payload-block">
                    <h4>Modified Payload (Attack Vector)</h4>
                    <pre className="json-box danger-json">
                      {formatJson(selectedIncident.modifiedRequest || selectedIncident.payload?.modified)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
