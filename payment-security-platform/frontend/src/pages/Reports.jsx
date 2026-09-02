import React from 'react';

export default function Reports() {
  return (
    <div>
      <h1>Reports</h1>
      <section>
        <h2>Overall Security Score</h2>
        <p>82 / 100</p>
      </section>
      <section>
        <h2>Scan Summary</h2>
        <p>12 APIs scanned. 5 vulnerabilities found (1 Critical, 2 High, 2 Medium).</p>
      </section>
      <section>
        <h2>API Test Results</h2>
        <ul>
          <li>/api/auth/login — 2 issues</li>
          <li>/api/payment/send — 1 issue</li>
        </ul>
      </section>
      <section>
        <h2>Recommendations</h2>
        <ul>
          <li>Fix SQL Injection in /api/payment/send</li>
          <li>Enable MFA and secure session cookies</li>
          <li>Filter response fields for user endpoints</li>
        </ul>
      </section>
    </div>
  );
}
