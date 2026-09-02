import React, { useState } from 'react';

const tests = [
  'Authentication',
  'Authorization',
  'BOLA/IDOR',
  'Input Validation',
  'Rate Limiting',
  'Excessive Data Exposure',
  'Security Misconfiguration',
  'Injection',
];

export default function SecurityScan() {
  const [selectedApi, setSelectedApi] = useState('');
  const [selectedTests, setSelectedTests] = useState([]);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);

  const toggleTest = (t) => {
    setSelectedTests((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const startScan = () => {
    setProgress(10);
    setResults(null);
    setTimeout(() => {
      setProgress(100);
      setResults({ status: 'Mock Scan Completed', issues: 2 });
    }, 800);
  };

  return (
    <div>
      <h1>Security Scan</h1>
      <div>
        <label>Select API</label>
        <select value={selectedApi} onChange={(e) => setSelectedApi(e.target.value)}>
          <option value="">Select API</option>
          <option>/api/auth/login</option>
          <option>/api/payment/send</option>
          <option>/api/user/123</option>
        </select>
      </div>
      <div>
        <h3>Security Tests</h3>
        {tests.map((t) => (
          <label key={t} style={{ display: 'block', margin: '0.25rem 0' }}>
            <input
              type="checkbox"
              checked={selectedTests.includes(t)}
              onChange={() => toggleTest(t)}
            />{' '}
            {t}
          </label>
        ))}
      </div>
      <button onClick={startScan}>Start Security Scan</button>
      <div>Scan Progress: {progress}%</div>
      {results && (
        <div>
          <h3>Mock Scan Results</h3>
          <p>Status: {results.status}</p>
          <p>Issues Found: {results.issues}</p>
        </div>
      )}
    </div>
  );
}
