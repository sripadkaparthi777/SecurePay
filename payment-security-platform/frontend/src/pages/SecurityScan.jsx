import React, { useMemo, useState } from 'react';
import { api } from '../services/api';

export default function SecurityScan() {
  const [selectedApi, setSelectedApi] = useState('ALL');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runScan = async () => {
    setLoading(true);
    setError('');
    setResults(null);
    setProgress(10);

    try {
      const result = await api.runSecurityScan();

      setProgress(100);
      setResults(result);
    } catch (err) {
      setProgress(0);

      const message =
        err?.response?.data?.error ||
        err?.message ||
        'Security scan failed.';

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = useMemo(() => {
    const allResults = results?.scan?.results || [];

    if (selectedApi === 'ALL') {
      return allResults;
    }

    return allResults.filter(
      (item) => item.testId.startsWith(selectedApi)
    );
  }, [results, selectedApi]);

  const passedCount = filteredResults.filter(
    (item) => item.status === 'PASS'
  ).length;

  const failedCount = filteredResults.filter(
    (item) => item.status === 'FAIL'
  ).length;

  return (
    <div>
      <h1>Security Scan</h1>

      <div>
        <label>Select API</label>

        <select
          value={selectedApi}
          onChange={(e) => setSelectedApi(e.target.value)}
          disabled={loading}
        >
          <option value="ALL">All OWASP API1-API10</option>
          <option value="API1">API1 - BOLA</option>
          <option value="API2">API2 - Authentication</option>
          <option value="API3">API3 - Property Authorization</option>
          <option value="API4">API4 - Resource Consumption</option>
          <option value="API5">API5 - Function Authorization</option>
          <option value="API6">API6 - Sensitive Business Flow</option>
          <option value="API7">API7 - SSRF</option>
          <option value="API8">API8 - Misconfiguration</option>
          <option value="API9">API9 - Inventory</option>
          <option value="API10">API10 - Unsafe Consumption</option>
        </select>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <button
          onClick={runScan}
          disabled={loading}
        >
          {loading ? 'Running Security Scan...' : 'Start Security Scan'}
        </button>
      </div>

      <div style={{ marginTop: '1rem' }}>
        Scan Progress: {progress}%
      </div>

      {error && (
        <div style={{ marginTop: '1rem' }}>
          <strong>Scan Error:</strong> {error}
        </div>
      )}

      {results && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Security Scan Results</h2>

          <p>
            <strong>Status:</strong>{' '}
            {results.scan?.status}
          </p>

          <p>
            <strong>Scanner:</strong>{' '}
            {results.scan?.scanner}
          </p>

          <p>
            <strong>Scanner Version:</strong>{' '}
            {results.scan?.scannerVersion}
          </p>

          <p>
            <strong>ZAP:</strong>{' '}
            {results.zap?.status}
          </p>

          <p>
            <strong>ZAP Version:</strong>{' '}
            {results.zap?.version || 'Unavailable'}
          </p>

          <div style={{ margin: '1rem 0' }}>
            <strong>Passed:</strong> {passedCount}{' '}
            |{' '}
            <strong>Failed:</strong> {failedCount}
          </div>

          <div>
            {filteredResults.map((item) => (
              <div
                key={item.testId}
                style={{
                  border: '1px solid #ccc',
                  padding: '1rem',
                  marginBottom: '1rem',
                  borderRadius: '8px',
                }}
              >
                <h3>
                  {item.testId} - {item.status}
                </h3>

                <p>
                  <strong>OWASP:</strong>{' '}
                  {item.owaspCategory}
                </p>

                <p>
                  <strong>Title:</strong>{' '}
                  {item.title}
                </p>

                <p>
                  <strong>Severity:</strong>{' '}
                  {item.severity}
                </p>

                <p>
                  <strong>Endpoint:</strong>{' '}
                  {item.method} {item.endpoint}
                </p>

                <p>
                  <strong>Expected:</strong>{' '}
                  {item.expectedStatus}
                </p>

                <p>
                  <strong>Actual:</strong>{' '}
                  {item.actualStatus}
                </p>

                <p>
                  <strong>Evidence:</strong>{' '}
                  {item.evidence}
                </p>

                <p>
                  <strong>Recommendation:</strong>{' '}
                  {item.recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
