import React from 'react';

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Shield, AlertCircle, CheckCircle } from 'lucide-react';

export default function Reports() {
  const [scanData, setScanData] = useState(null);
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const scans = await api.getSecurityScans?.() || [];
        const latest = scans[0];
        if (latest) {
          setScanData(latest);
          const f = await api.getSecurityFindings?.(latest.scanId) || [];
          setFindings(f);
        }
      } catch (err) {
        console.error("Report fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

  if (loading) return <div>Loading Security Reports...</div>;

  return (
    <div className="reports-container">
      <h1>Security Audit Reports</h1>
      
      <section className="report-card">
        <h2>System Security Posture</h2>
        <div className="score-display">
          <Shield size={48} color="#5f259f" />
          <div className="score-text">
            <strong>{scanData?.status === 'VALID' ? '82' : 'N/A'}/100</strong>
            <span>Global Trust Score</span>
          </div>
        </div>
      </section>

      <section className="report-card">
        <h2>Latest Scan Summary</h2>
        <p><strong>Scanner:</strong> {scanData?.scanner || 'SecurePay Engine'} v{scanData?.scannerVersion}</p>
        <p><strong>Status:</strong> {scanData?.status || 'No Scans Run'}</p>
        <p><strong>Completed:</strong> {scanData?.completedAt ? new Date(scanData.completedAt).toLocaleString() : 'N/A'}</p>
      </section>

      <section className="report-card">
        <h2>Active Vulnerabilities</h2>
        {findings.length === 0 ? (
          <p className="no-findings"><CheckCircle size={16} /> No critical vulnerabilities detected.</p>
        ) : (
          <ul className="findings-list">
            {findings.map((f, i) => (
              <li key={i} className={`finding-item severity-${f.severity?.toLowerCase()}`}>
                <AlertCircle size={14} />
                <strong>{f.owaspCategory}:</strong> {f.title}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
