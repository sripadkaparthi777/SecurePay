import React from 'react';
import { Database, Server, Zap } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="navbar" style={{ 
      padding: '0 24px', 
      height: '64px', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      background: 'rgba(10, 12, 16, 0.8)',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#94a3b8', fontSize: '14px' }}>SecurePay / </span>
        <span style={{ color: '#e2e8f0', fontWeight: '600' }}>Command Center</span>
      </div>

      <div className="header-status-group" style={{ display: 'flex', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>
          <Server size={14} /> API ENGINE ONLINE
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>
          <Database size={14} /> DB ONLINE
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#00f2ff', fontWeight: 'bold' }}>
          <Zap size={14} /> ZAP CONNECTED
        </div>
      </div>
    </nav>
  );
}
