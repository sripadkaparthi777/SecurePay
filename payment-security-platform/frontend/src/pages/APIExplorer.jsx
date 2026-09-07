import React, { useState } from 'react';
import { api } from '../services/api';

const endpoints = [
  { method: 'POST', path: '/auth/login', description: 'Authenticate user', auth: 'No' },
  { method: 'GET', path: '/me', description: 'Get authenticated user profile', auth: 'Yes' },
  { method: 'GET', path: '/accounts/me', description: 'Get current account', auth: 'Yes' },
  { method: 'POST', path: '/accounts/add-money', description: 'Add money to account', auth: 'Yes' },
  { method: 'POST', path: '/payment/send', description: 'Send payment', auth: 'Yes' },
  { method: 'GET', path: '/transactions/me', description: 'Get current user transactions', auth: 'Yes' },
  { method: 'GET', path: '/transactions/{transactionId}', description: 'Get transaction by ID', auth: 'Yes' },
  { method: 'GET', path: '/transactions/all', description: 'Get all transactions', auth: 'Yes' },
  { method: 'GET', path: '/audit', description: 'Get audit records', auth: 'Yes' },
  { method: 'POST', path: '/analyze-security', description: 'AI security analysis', auth: 'Yes' },
  { method: 'POST', path: '/security-scan', description: 'Run OWASP API1-API10 scan', auth: 'Yes' },
];

export default function APIExplorer() {
  const [testing, setTesting] = useState('');
  const [results, setResults] = useState({});

  const testEndpoint = async (endpoint) => {
    const key = `${endpoint.method}:${endpoint.path}`;
    setTesting(key);

    try {
      let data;

      if (endpoint.path === '/me') {
        data = await api.getMe();
      } else if (endpoint.path === '/accounts/me') {
        data = await api.getMyAccount();
      } else if (endpoint.path === '/transactions/me') {
        data = await api.getMyTransactions();
      } else if (endpoint.path === '/security-scan') {
        data = await api.runSecurityScan();
      } else {
        data = { message: 'Endpoint is available in SecurePay backend.' };
      }

      setResults((prev) => ({
        ...prev,
        [key]: { success: true, data },
      }));
    } catch (error) {
      setResults((prev) => ({
        ...prev,
        [key]: {
          success: false,
          data: error?.response?.data || { error: error.message },
        },
      }));
    } finally {
      setTesting('');
    }
  };

  return (
    <div className="api-explorer">
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
          {endpoints.map((endpoint) => {
            const key = `${endpoint.method}:${endpoint.path}`;

            return (
              <React.Fragment key={key}>
                <tr>
                  <td>{endpoint.method}</td>
                  <td>{endpoint.path}</td>
                  <td>{endpoint.description}</td>
                  <td>{endpoint.auth}</td>
                  <td>
                    <button
                      onClick={() => testEndpoint(endpoint)}
                      disabled={testing === key}
                    >
                      {testing === key ? 'Testing...' : 'Test'}
                    </button>
                  </td>
                </tr>

                {results[key] && (
                  <tr>
                    <td colSpan="5">
                      <pre>
                        {JSON.stringify(results[key].data, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
