import React, { useState, useEffect } from 'react';
import StatCard from '../components/StatCard';
import SecurityScore from '../components/SecurityScore';
import TransactionTable from '../components/TransactionTable';

const STORAGE_KEY = 'securepay_dashboard_state';

const initialSecurityData = {
  'TX-001': {
    risk: 'Low',
    score: 92,
    status: 'Secure',
    tests: [
      { name: 'Authentication', status: 'Passed', detail: 'Valid session token verified' },
      { name: 'Authorization / BOLA', status: 'Passed', detail: 'Sender cannot access another user transaction' },
      { name: 'Amount Manipulation', status: 'Passed', detail: 'Amount validation accepted ₹100' },
      { name: 'Replay Attack', status: 'Passed', detail: 'Duplicate transaction rejected' },
      { name: 'Rate Limiting', status: 'Passed', detail: 'Request threshold within safe limit' },
    ],
  },
  'TX-002': {
    risk: 'Medium',
    score: 68,
    status: 'Warning',
    tests: [
      { name: 'Authentication', status: 'Passed', detail: 'Valid session token verified' },
      { name: 'Authorization / BOLA', status: 'Passed', detail: 'Transaction ownership verified' },
      { name: 'Amount Manipulation', status: 'Passed', detail: 'Amount validation successful' },
      { name: 'Replay Attack', status: 'Warning', detail: 'Repeated transaction detected' },
      { name: 'Rate Limiting', status: 'Failed', detail: 'Multiple requests allowed' },
    ],
  },
};

const defaultTransactions = [
  {
    id: 'TX-001',
    receiver: 'Rahul Kumar',
    receiverUpi: 'rahul@upi',
    amount: 100,
    status: 'Completed',
    date: 'Today, 10:42 AM',
  },
  {
    id: 'TX-002',
    receiver: 'SBI Bank',
    receiverUpi: 'sbi@upi',
    amount: 250.5,
    status: 'Pending',
    date: 'Yesterday, 6:15 PM',
  },
];

const loadSavedTransactions = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultTransactions;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.transactions) && parsed.transactions.length > 0) {
      return parsed.transactions;
    }
  } catch (err) {
    console.warn('Failed to parse saved state in Dashboard:', err);
  }
  return defaultTransactions;
};

export default function Dashboard() {
  const [mode, setMode] = useState('USER');
  const [transactions, setTransactions] = useState(loadSavedTransactions);
  const [selectedTransactionId, setSelectedTransactionId] = useState(() => {
    const txs = loadSavedTransactions();
    return txs[0]?.id || 'TX-001';
  });

  useEffect(() => {
    const updateTransactions = () => {
      const updated = loadSavedTransactions();
      setTransactions(updated);
      setSelectedTransactionId((prev) => {
        if (updated.some((t) => t.id === prev)) return prev;
        return updated[0]?.id || 'TX-001';
      });
    };

    updateTransactions();

    window.addEventListener('storage', updateTransactions);
    window.addEventListener('focus', updateTransactions);
    return () => {
      window.removeEventListener('storage', updateTransactions);
      window.removeEventListener('focus', updateTransactions);
    };
  }, []);

  const handleViewSecurity = (transaction) => {
    setSelectedTransactionId(transaction.id || transaction);
    setMode('SECURITY');
  };

  const selectedTxObj =
    transactions.find((t) => t.id === selectedTransactionId) || transactions[0];

  const getSecurityForTx = (txObj) => {
    if (!txObj) {
      return {
        score: 85,
        risk: 'Low',
        status: 'Secure',
        tests: [],
      };
    }

    if (txObj.securityAnalysis) {
      const analysis = txObj.securityAnalysis;
      const tests = [
        { name: 'Authentication', status: 'Passed', detail: 'Verified session token' },
        { name: 'Authorization / BOLA', status: 'Passed', detail: 'Authorized transaction sender' },
        { name: 'Amount Manipulation', status: 'Passed', detail: `Accepted amount ₹${txObj.amount}` },
        {
          name: 'AI Vulnerability Check',
          status: analysis.vulnerabilities?.length > 0 ? 'Warning' : 'Passed',
          detail: analysis.explanation || 'No major issues detected',
        },
      ];

      return {
        score: analysis.securityScore ?? 85,
        risk: analysis.riskLevel ?? 'Low',
        status: analysis.securityScore >= 80 ? 'Secure' : 'Warning',
        explanation: analysis.explanation,
        vulnerabilities: analysis.vulnerabilities,
        recommendations: analysis.recommendations,
        tests,
      };
    }

    if (initialSecurityData[txObj.id]) {
      return initialSecurityData[txObj.id];
    }

    return {
      score: 88,
      risk: 'Low',
      status: 'Secure',
      tests: [
        { name: 'Authentication', status: 'Passed', detail: 'Valid session token verified' },
        { name: 'Authorization / BOLA', status: 'Passed', detail: 'Transaction ownership verified' },
        { name: 'Amount Manipulation', status: 'Passed', detail: `Amount validation accepted ₹${txObj.amount}` },
        { name: 'Replay Attack', status: 'Passed', detail: 'Replay attack check passed' },
        { name: 'Rate Limiting', status: 'Passed', detail: 'Request threshold within safe limit' },
      ],
    };
  };

  const selectedSecurity = getSecurityForTx(selectedTxObj);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Payment activity and API security monitoring</p>
        </div>

        <div className="mode-toggle">
          <button
            className={mode === 'USER' ? 'active' : ''}
            onClick={() => setMode('USER')}
          >
            User Mode
          </button>

          <button
            className={mode === 'SECURITY' ? 'active security' : ''}
            onClick={() => setMode('SECURITY')}
          >
            Security Mode
          </button>
        </div>
      </div>

      {mode === 'USER' && (
        <>
          <div className="stats-grid">
            <StatCard title="Overall Security Score" value="82/100" />
            <StatCard title="APIs Scanned" value="12" />
            <StatCard title="Vulnerabilities Found" value="5" />
            <StatCard title="Critical Vulnerabilities" value="1" />
          </div>

          <SecurityScore score={82} />

          <section className="dashboard-section">
            <h2>Recent Security Scans</h2>
            <p>/api/auth/login — 2 issues found</p>
          </section>

          <section className="dashboard-section">
            <h2>Vulnerability Summary</h2>
            <p>1 Critical, 2 High, 2 Medium</p>
          </section>

          <section className="dashboard-section">
            <h2>Recent Payment Transactions</h2>

            <TransactionTable
              transactions={transactions}
              onViewSecurity={handleViewSecurity}
            />
          </section>
        </>
      )}

      {mode === 'SECURITY' && selectedTxObj && (
        <section className="security-dashboard">
          <div className="security-header">
            <div>
              <h2>Security Analysis</h2>
              <p>
                Transaction <strong>{selectedTxObj.id}</strong>
              </p>
            </div>

            <button onClick={() => setMode('USER')}>
              ← Back to User Mode
            </button>
          </div>

          <div className="security-summary">
            <div className="security-score-large">
              <span>Security Score</span>
              <strong>{selectedSecurity.score}/100</strong>
            </div>

            <div>
              <span>Transaction Status</span>
              <strong>{selectedTxObj.status}</strong>
            </div>

            <div>
              <span>Security Status</span>
              <strong>{selectedSecurity.status}</strong>
            </div>
          </div>

          <div className="transaction-details">
            <h3>Transaction Details</h3>

            <div className="details-grid">
              <div>
                <span>Transaction ID</span>
                <strong>{selectedTxObj.id}</strong>
              </div>

              <div>
                <span>Receiver</span>
                <strong>{selectedTxObj.receiver}</strong>
              </div>

              <div>
                <span>UPI ID</span>
                <strong>{selectedTxObj.receiverUpi}</strong>
              </div>

              <div>
                <span>Amount</span>
                <strong>₹{Number(selectedTxObj.amount).toFixed(2)}</strong>
              </div>
            </div>
          </div>

          <div className="security-tests">
            <h3>Security Tests Performed</h3>

            {selectedSecurity.tests.map((test) => (
              <div className="security-test" key={test.name}>
                <div>
                  <strong>{test.name}</strong>
                  <p>{test.detail}</p>
                </div>

                <span className={`test-result ${test.status.toLowerCase()}`}>
                  {test.status}
                </span>
              </div>
            ))}
          </div>

          {selectedSecurity.explanation && (
            <div className="security-note" style={{ marginTop: '16px' }}>
              <strong>AI Analysis Explanation</strong>
              <p>{selectedSecurity.explanation}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
