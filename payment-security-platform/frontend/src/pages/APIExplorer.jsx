import React from 'react';

const apis = [
  { method: 'POST', endpoint: '/api/auth/login', desc: 'Authenticate user', auth: 'Required' },
  { method: 'POST', endpoint: '/api/payment/send', desc: 'Send payment', auth: 'Required' },
  { method: 'GET', endpoint: '/api/payment/{transactionId}', desc: 'Retrieve transaction', auth: 'Required' },
  { method: 'GET', endpoint: '/api/user/{userId}', desc: 'Retrieve user profile', auth: 'Required' },
  { method: 'POST', endpoint: '/api/payment/refund', desc: 'Process refund', auth: 'Required' },
];

export default function APIExplorer() {
  return (
    <div>
      <h1>API Explorer</h1>
      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Endpoint</th>
            <th>Description</th>
            <th>Authentication</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {apis.map((a, i) => (
            <tr key={i}>
              <td>{a.method}</td>
              <td>{a.endpoint}</td>
              <td>{a.desc}</td>
              <td>{a.auth}</td>
              <td>
                <button>Test</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
