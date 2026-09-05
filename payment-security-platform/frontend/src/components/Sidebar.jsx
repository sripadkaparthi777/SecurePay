import React from 'react';
import { Link } from 'react-router-dom';

export default function Sidebar() {
  let canViewIncidents = false;
  try {
    const rawUser = localStorage.getItem('paymentUser');
    if (rawUser) {
      const user = JSON.parse(rawUser);
      if (['ADMIN', 'SECURITY_REVIEWER'].includes(user?.role)) {
        canViewIncidents = true;
      }
    }
  } catch (err) {
    console.warn('Error checking user role in Sidebar:', err);
  }

  const links = [
    { to: '/dashboard', label: 'Dashboard' },
    ...(canViewIncidents ? [{ to: '/security-incidents', label: 'Security Incidents' }] : []),
    { to: '/payment', label: 'Dummy Payment' },
    { to: '/api-explorer', label: 'API Explorer' },
    { to: '/security-scan', label: 'Security Scan' },
    { to: '/vulnerabilities', label: 'Vulnerabilities' },
    { to: '/reports', label: 'Reports' },
  ];

  return (
    <aside className="sidebar">
      <h2>Menu</h2>
      <ul>
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to}>{l.label}</Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
