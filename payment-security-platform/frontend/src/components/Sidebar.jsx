import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CreditCard,
  ShieldCheck,
  Search,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const Sidebar = ({ collapsed, setCollapsed, user }) => {
  const role = user?.role || user?.user?.role || '';

  const canViewIncidents =
    role === 'ADMIN' ||
    role === 'SECURITY_REVIEWER' ||
    role === 'admin' ||
    role === 'security_reviewer';

  const links = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      to: '/payment',
      label: 'Payments',
      icon: CreditCard,
    },
    {
      to: '/api-explorer',
      label: 'API Explorer',
      icon: Search,
    },
    {
      to: '/security-scan',
      label: 'Security Scan',
      icon: ShieldCheck,
    },
    ...(canViewIncidents
      ? [
          {
            to: '/security-incidents',
            label: 'Security Incidents',
            icon: AlertTriangle,
          },
        ]
      : []),
  ];

  return (
    <aside className={`sidebar glass-card ${collapsed ? 'sidebar-collapsed' : ''}`} style={{ borderRadius: 0, borderTop: 0, borderBottom: 0, borderLeft: 0 }}>
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <ShieldCheck size={24} color="#00f2ff" />
        </div>

        {!collapsed && (
          <div className="sidebar-brand-text">
            <strong style={{ color: '#00f2ff' }}>SECUREPAY</strong>
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>API SECURITY PLATFORM</span>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="system-status-indicator" style={{ padding: '0 20px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="dot pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#10b981' }}>SYSTEM ONLINE</span>
        </div>
      )}

      <nav className="sidebar-nav">
        {links.map((link) => {
          const Icon = link.icon;

          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              title={collapsed ? link.label : undefined}
            >
              <Icon size={20} />

              {!collapsed && (
                <span>{link.label}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <button
        type="button"
        className="sidebar-collapse-button"
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronRight size={19} />
        ) : (
          <ChevronLeft size={19} />
        )}

        {!collapsed && <span>Collapse</span>}
      </button>
    </aside>
  );
};

export default Sidebar;
