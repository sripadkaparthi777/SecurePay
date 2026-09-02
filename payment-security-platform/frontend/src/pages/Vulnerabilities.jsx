import React, { useState } from 'react';
import VulnerabilityCard from '../components/VulnerabilityCard';

const mockVulns = [
  {
    severity: 'Critical',
    name: 'SQL Injection',
    endpoint: '/api/payment/send',
    method: 'POST',
    desc: 'Unsanitized user input passed to query.',
    evidence: 'Error message reveals query structure.',
    recommendation: 'Use parameterized queries / prepared statements.',
    status: 'Open',
  },
  {
    severity: 'High',
    name: 'Broken Authentication',
    endpoint: '/api/auth/login',
    method: 'POST',
    desc: 'Weak session management and token handling.',
    evidence: 'Cookie lacks HttpOnly and Secure flags.',
    recommendation: 'Enforce MFA and secure cookie settings.',
    status: 'Open',
  },
  {
    severity: 'Medium',
    name: 'Excessive Data Exposure',
    endpoint: '/api/user/{userId}',
    method: 'GET',
    desc: 'Response includes internal fields.',
    evidence: 'Response contains internal IDs.',
    recommendation: 'Filter response fields explicitly.',
    status: 'Fixed',
  },
];

export default function Vulnerabilities() {
  const [filter, setFilter] = useState('All');
  const filtered =
    filter === 'All' ? mockVulns : mockVulns.filter((v) => v.severity === filter);

  return (
    <div>
      <h1>Vulnerabilities</h1>
      <select value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option>All</option>
        <option>Critical</option>
        <option>High</option>
        <option>Medium</option>
      </select>
      {filtered.map((v, i) => (
        <VulnerabilityCard key={i} {...v} />
      ))}
    </div>
  );
}
