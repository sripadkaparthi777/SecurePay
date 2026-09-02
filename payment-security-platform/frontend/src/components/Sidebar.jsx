import React from 'react';
import { Link } from 'react-router-dom';

export default function Sidebar() {
  const links = [
    { to: '/dashboard', label: 'Dashboard' },
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
