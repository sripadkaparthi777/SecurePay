import React, { useState, useEffect } from 'react';
import StatCard from '../components/StatCard';
import SecurityScore from '../components/SecurityScore';
import TransactionTable from '../components/TransactionTable';
import { api } from '../services/api';

const STORAGE_KEY = 'securepay_dashboard_state';

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

    if (!raw) {
      return defaultTransactions;
    }

    const parsed = JSON.parse(raw);

    if (
      Array.isArray(parsed?.transactions) &&
      parsed.transactions.length > 0
    ) {
      return parsed.transactions;
    }
  } catch (err) {
    console.warn('Failed to parse saved Dashboard state:', err);
  }

  return defaultTransactions;
};

const calculateSecurityScore = (failedResults) => {
  const critical = failedResults.filter(
    (r) => String(r.severity).toUpperCase() === 'CRITICAL'
  ).length;

  const high = failedResults.filter(
    (r) => String(r.severity).toUpperCase() === 'HIGH'
  ).length;

  const medium = failedResults.filter(
    (r) => String(r.severity).toUpperCase() === 'MEDIUM'
  ).length;

  const low = failedResults.filter(
    (r) => String(r.severity).toUpperCase() === 'LOW'
  ).length;

  return Math.max(
    0,
    100 -
      critical * 30 -
      high * 20 -
      medium * 10 -
      low * 5
  );
};

const getRiskLevel = (failedResults) => {
  if (
    failedResults.some(
      (r) => String(r.severity).toUpperCase() === 'CRITICAL'
    )
  ) {
    return 'CRITICAL';
  }

  if (
    failedResults.some(
      (r) => String(r.severity).toUpperCase() === 'HIGH'
    )
  ) {
    return 'HIGH';
  }

  if (
    failedResults.some(
      (r) => String(r.severity).toUpperCase() === 'MEDIUM'
    )
  ) {
    return 'MEDIUM';
  }

  return 'LOW';
};

const getSecurityStatus = (score) => {
  if (score >= 90) return 'Secure';
  if (score >= 70) return 'Warning';
  return 'At Risk';
};

export default function Dashboard() {
  const [mode, setMode] = useState('USER');

  const [transactions, setTransactions] = useState(
    loadSavedTransactions
  );

  const [selectedTransactionId, setSelectedTransactionId] = useState(
    () => {
      const txs = loadSavedTransactions();
      return txs[0]?.id || null;
    }
  );

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  useEffect(() => {
    const updateTransactions = () => {
      const updated = loadSavedTransactions();

      setTransactions(updated);

      setSelectedTransactionId((previousId) => {
        if (updated.some((tx) => tx.id === previousId)) {
          return previousId;
        }

        return updated[0]?.id || null;
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
    setAnalysisError('');
    setMode('SECURITY');
  };

  const selectedTxObj =
    transactions.find(
      (tx) => tx.id === selectedTransactionId
    ) || transactions[0];

  /*
   * ============================================================
   * REAL SECUREPAY SECURITY SCAN
   * ============================================================
   */
  const handleAnalyzeTransaction = async () => {
    if (!selectedTxObj) return;

    setIsAnalyzing(true);
    setAnalysisError('');

    try {
      /*
       * This calls:
       *
       * POST /api/security-scan
       *
       * The backend executes:
       * SecurePay Deterministic Security Engine
       * OWASP API1 - API10
       */
      const response = await api.runSecurityScan();

      if (!response?.success || !response?.scan) {
        throw new Error(
          'Security scan response was incomplete.'
        );
      }

      const scan = response.scan;

      const results = Array.isArray(scan.results)
        ? scan.results
        : [];

      const failedResults = results.filter(
        (result) =>
          String(result.status).toUpperCase() !== 'PASS'
      );

      const securityScore =
        calculateSecurityScore(failedResults);

      const riskLevel =
        getRiskLevel(failedResults);

      const securityStatus =
        getSecurityStatus(securityScore);

      const passedCount = results.filter(
        (result) =>
          String(result.status).toUpperCase() === 'PASS'
      ).length;

      /*
       * Build security analysis from REAL OWASP results.
       */
      const securityAnalysis = {
        securityScore,
        riskLevel,
        securityStatus,

        scanId: scan.scanId,
        scanner: scan.scanner,
        scannerVersion: scan.scannerVersion,

        findingsCount: scan.findingsCount,

        passedCount,
        totalTests: results.length,

        vulnerabilities: failedResults,

        recommendations: failedResults
          .map((result) => result.recommendation)
          .filter(Boolean),

        explanation:
          failedResults.length === 0
            ? `SecurePay completed a valid OWASP API1-API10 security scan. All ${results.length} tested security controls passed and no vulnerabilities were detected.`
            : `SecurePay detected ${failedResults.length} security finding(s) during the OWASP API1-API10 security scan.`,

        owaspResults: results,

        zap: response.zap || null,
      };

      const updatedTransactions = transactions.map(
        (transaction) =>
          transaction.id === selectedTxObj.id
            ? {
                ...transaction,
                securityAnalysis,
              }
            : transaction
      );

      setTransactions(updatedTransactions);

      /*
       * Save the real scan result locally so it remains
       * available when the Dashboard is revisited.
       */
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          transactions: updatedTransactions,
        })
      );
    } catch (error) {
      console.error(
        'SecurePay security scan error:',
        error
      );

      setAnalysisError(
        error.response?.data?.error ||
          error.message ||
          'Failed to perform SecurePay security scan.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  /*
   * ============================================================
   * SECURITY DATA
   * ============================================================
   */
  const analysis =
    selectedTxObj?.securityAnalysis || null;

  const score = analysis?.securityScore ?? null;

  const riskLevel =
    analysis?.riskLevel || 'Not Analyzed';

  const securityStatus =
    analysis?.securityStatus ||
    'Not Analyzed';

  const owaspResults =
    Array.isArray(analysis?.owaspResults)
      ? analysis.owaspResults
      : [];

  const passedCount =
    owaspResults.filter(
      (result) =>
        String(result.status).toUpperCase() === 'PASS'
    ).length;

  const failedCount =
    owaspResults.filter(
      (result) =>
        String(result.status).toUpperCase() !== 'PASS'
    ).length;

  const criticalCount =
    owaspResults.filter(
      (result) =>
        String(result.status).toUpperCase() !== 'PASS' &&
        String(result.severity).toUpperCase() === 'CRITICAL'
    ).length;

  /*
   * ============================================================
   * USER MODE
   * ============================================================
   */
  return (
    <div className="dashboard">

      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>
            Payment activity and API security monitoring
          </p>
        </div>

        <div className="mode-toggle">

          <button
            className={
              mode === 'USER'
                ? 'active'
                : ''
            }
            onClick={() => setMode('USER')}
          >
            User Mode
          </button>

          <button
            className={
              mode === 'SECURITY'
                ? 'active security'
                : ''
            }
            onClick={() => {
              if (selectedTxObj) {
                setMode('SECURITY');
              }
            }}
          >
            Security Mode
          </button>

        </div>
      </div>

      {mode === 'USER' && (
        <>
          <div className="stats-grid">

            <StatCard
              title="Overall Security Score"
              value={
                score !== null
                  ? `${score}/100`
                  : 'Not Analyzed'
              }
            />

            <StatCard
              title="APIs Scanned"
              value={
                analysis?.totalTests ??
                'Not Analyzed'
              }
            />

            <StatCard
              title="Vulnerabilities Found"
              value={
                analysis
                  ? failedCount
                  : 'Not Analyzed'
              }
            />

            <StatCard
              title="Critical Vulnerabilities"
              value={
                analysis
                  ? criticalCount
                  : 'Not Analyzed'
              }
            />

          </div>

          {score !== null && (
            <SecurityScore score={score} />
          )}

          <section className="dashboard-section">
            <h2>Recent Security Scans</h2>

            {analysis ? (
              <p>
                {analysis.scanner} —{' '}
                {analysis.totalTests} OWASP API tests,
                {' '}
                {analysis.findingsCount} finding(s)
              </p>
            ) : (
              <p>
                No security scan has been run yet.
              </p>
            )}
          </section>

          <section className="dashboard-section">
            <h2>Vulnerability Summary</h2>

            {analysis ? (
              <p>
                Passed: {passedCount} |
                {' '}
                Findings: {failedCount}
              </p>
            ) : (
              <p>
                Run a security scan to see the
                vulnerability summary.
              </p>
            )}
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
                Transaction{' '}
                <strong>
                  {selectedTxObj.id}
                </strong>
              </p>
            </div>

            <button
              onClick={() => setMode('USER')}
            >
              ← Back to User Mode
            </button>
          </div>

          <div className="security-summary">

            <div className="security-score-large">
              <span>
                Security Score
              </span>

              <strong>
                {score !== null
                  ? `${score}/100`
                  : 'Not Analyzed'}
              </strong>
            </div>

            <div>
              <span>
                Transaction Status
              </span>

              <strong>
                {selectedTxObj.status ||
                  'COMPLETED'}
              </strong>
            </div>

            <div>
              <span>
                Risk Level
              </span>

              <strong>
                {riskLevel}
              </strong>
            </div>

          </div>

          <div className="transaction-details">

            <h3>
              Transaction Details
            </h3>

            <div className="details-grid">

              <div>
                <span>
                  Transaction ID
                </span>

                <strong>
                  {selectedTxObj.id}
                </strong>
              </div>

              <div>
                <span>
                  Sender
                </span>

                <strong>
                  {selectedTxObj.sender ||
                    'User'}
                </strong>
              </div>

              <div>
                <span>
                  Receiver
                </span>

                <strong>
                  {selectedTxObj.receiver ||
                    'Unknown'}
                </strong>
              </div>

              <div>
                <span>
                  UPI ID
                </span>

                <strong>
                  {selectedTxObj.receiverUpi ||
                    'N/A'}
                </strong>
              </div>

              <div>
                <span>
                  Amount
                </span>

                <strong>
                  ₹
                  {Number(
                    selectedTxObj.amount || 0
                  ).toFixed(2)}
                </strong>
              </div>

            </div>
          </div>

          {!analysis && (
            <div className="security-tests">

              <h3>
                SecurePay Security Engine
              </h3>

              <p>
                This transaction has not been
                analyzed yet.
              </p>

              <p>
                Click below to run the real
                OWASP API1-API10 security scan.
              </p>

              {analysisError && (
                <p
                  style={{
                    color: '#ef4444',
                    fontWeight: '600',
                  }}
                >
                  {analysisError}
                </p>
              )}

              <button
                onClick={
                  handleAnalyzeTransaction
                }
                disabled={isAnalyzing}
                style={{
                  marginTop: '12px',
                  padding: '10px 18px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isAnalyzing
                    ? 'not-allowed'
                    : 'pointer',
                  fontWeight: '600',
                }}
              >
                {isAnalyzing
                  ? 'Running OWASP API1-API10...'
                  : 'Analyze Transaction'}
              </button>

            </div>
          )}

          {analysis && (
            <>
              <div className="security-tests">

                <h3>
                  SecurePay OWASP API1-API10
                </h3>

                <p>
                  Scanner:{' '}
                  <strong>
                    {analysis.scanner}
                  </strong>
                </p>

                <p>
                  Version:{' '}
                  <strong>
                    {analysis.scannerVersion}
                  </strong>
                </p>

                <p>
                  Scan ID:{' '}
                  <strong>
                    {analysis.scanId}
                  </strong>
                </p>

                <p>
                  Result:{' '}
                  <strong>
                    {analysis.findingsCount === 0
                      ? 'All tested controls passed'
                      : `${analysis.findingsCount} finding(s) detected`}
                  </strong>
                </p>

              </div>

              <div className="security-tests">

                <h3>
                  OWASP API Security Tests
                </h3>

                {owaspResults.map(
                  (result) => {
                    const passed =
                      String(
                        result.status
                      ).toUpperCase() ===
                      'PASS';

                    return (
                      <div
                        className="security-test"
                        key={result.testId}
                      >
                        <div>

                          <strong>
                            {result.owaspCategory}
                          </strong>

                          <p>
                            {result.title}
                          </p>

                          <p>
                            Endpoint:{' '}
                            {result.endpoint}
                          </p>

                          <p>
                            {result.description}
                          </p>

                          <p>
                            Evidence:{' '}
                            {result.evidence}
                          </p>

                        </div>

                        <span
                          className={`test-result ${
                            passed
                              ? 'passed'
                              : 'failed'
                          }`}
                        >
                          {passed
                            ? 'PASS'
                            : 'FAIL'}
                        </span>

                      </div>
                    );
                  }
                )}

              </div>

              <div className="security-tests">

                <h3>
                  Security Summary
                </h3>

                <p>
                  <strong>
                    Security Status:
                  </strong>{' '}
                  {securityStatus}
                </p>

                <p>
                  <strong>
                    Risk Level:
                  </strong>{' '}
                  {riskLevel}
                </p>

                <p>
                  <strong>
                    Tests Passed:
                  </strong>{' '}
                  {passedCount}
                </p>

                <p>
                  <strong>
                    Findings:
                  </strong>{' '}
                  {failedCount}
                </p>

              </div>

              <div className="security-tests">

                <h3>
                  OWASP ZAP Status
                </h3>

                {analysis.zap ? (
                  <>
                    <p>
                      Scanner:{' '}
                      <strong>
                        {analysis.zap.scanner}
                      </strong>
                    </p>

                    <p>
                      Status:{' '}
                      <strong>
                        {analysis.zap.status}
                      </strong>
                    </p>

                    <p>
                      Version:{' '}
                      <strong>
                        {analysis.zap.version ||
                          'Not Available'}
                      </strong>
                    </p>
                  </>
                ) : (
                  <p>
                    ZAP status was not returned.
                  </p>
                )}

              </div>

              {analysis.recommendations?.length >
                0 && (
                <div className="security-tests">

                  <h3>
                    Security Recommendations
                  </h3>

                  <ul>
                    {analysis.recommendations.map(
                      (recommendation, index) => (
                        <li key={index}>
                          {recommendation}
                        </li>
                      )
                    )}
                  </ul>

                </div>
              )}

            </>
          )}

        </section>
      )}

    </div>
  );
}