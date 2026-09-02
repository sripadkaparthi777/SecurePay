
import React, { useEffect, useState } from 'react';
import StatCard from '../components/StatCard';
import SecurityScore from '../components/SecurityScore';
import TransactionTable from '../components/TransactionTable';

const STORAGE_KEY = 'securepay_dashboard_state';

export default function Dashboard() {
  const [mode, setMode] = useState('USER');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [transactions, setTransactions] = useState([]);

  // =============================
  // LOAD TRANSACTIONS
  // =============================
  useEffect(() => {
    const loadTransactions = () => {
      try {
        const savedState = localStorage.getItem(STORAGE_KEY);

        if (savedState) {
          const parsedState = JSON.parse(savedState);

          if (Array.isArray(parsedState.transactions)) {
            setTransactions(parsedState.transactions);

            // Keep selected transaction updated
            setSelectedTransaction((current) => {
              if (!current) return null;

              return (
                parsedState.transactions.find(
                  (tx) => tx.id === current.id
                ) || current
              );
            });
          } else {
            setTransactions([]);
          }
        } else {
          setTransactions([]);
        }
      } catch (error) {
        console.error(
          'Failed to load payment transactions:',
          error
        );

        setTransactions([]);
      }
    };

    loadTransactions();

    // Storage event for changes from other tabs
    const handleStorageChange = () => {
      loadTransactions();
    };

    window.addEventListener(
      'storage',
      handleStorageChange
    );

    // Custom event for changes in the same tab
    const handleSecurePayUpdate = () => {
      loadTransactions();
    };

    window.addEventListener(
      'securepay-state-updated',
      handleSecurePayUpdate
    );

    return () => {
      window.removeEventListener(
        'storage',
        handleStorageChange
      );

      window.removeEventListener(
        'securepay-state-updated',
        handleSecurePayUpdate
      );
    };
  }, []);

  // =============================
  // SELECT TRANSACTION
  // =============================
  const handleViewSecurity = (transaction) => {
    setSelectedTransaction(transaction);
    setMode('SECURITY');
  };

  // =============================
  // GET SECURITY ANALYSIS
  // =============================
  const analysis =
    selectedTransaction?.securityAnalysis || null;

  // =============================
  // SECURITY MODE
  // =============================
  const handleSecurityMode = () => {
    if (transactions.length > 0) {
      setSelectedTransaction(transactions[0]);
      setMode('SECURITY');
    }
  };

  return (
    <div className="dashboard">

      {/* =============================
          DASHBOARD HEADER
      ============================= */}
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>

          <p>
            Payment activity and API security monitoring
          </p>
        </div>

        <div className="mode-toggle">

          {/* USER MODE */}
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

          {/* SECURITY MODE */}
          <button
            className={
              mode === 'SECURITY'
                ? 'active security'
                : ''
            }
            onClick={handleSecurityMode}
          >
            Security Mode
          </button>

        </div>
      </div>

      {/* =====================================================
          USER MODE
      ===================================================== */}
      {mode === 'USER' && (
        <>
          {/* STATS */}
          <div className="stats-grid">

            <StatCard
              title="Overall Security Score"
              value="82/100"
            />

            <StatCard
              title="APIs Scanned"
              value="12"
            />

            <StatCard
              title="Vulnerabilities Found"
              value="5"
            />

            <StatCard
              title="Critical Vulnerabilities"
              value="1"
            />

          </div>

          {/* SECURITY SCORE */}
          <SecurityScore score={82} />

          {/* RECENT SECURITY SCANS */}
          <section className="dashboard-section">
            <h2>Recent Security Scans</h2>

            <p>
              /api/auth/login — 2 issues found
            </p>
          </section>

          {/* VULNERABILITY SUMMARY */}
          <section className="dashboard-section">
            <h2>Vulnerability Summary</h2>

            <p>
              1 Critical, 2 High, 2 Medium
            </p>
          </section>

          {/* PAYMENT TRANSACTIONS */}
          <section className="dashboard-section">

            <h2>
              Recent Payment Transactions
            </h2>

            <TransactionTable
              transactions={transactions}
              onViewSecurity={handleViewSecurity}
            />

          </section>
        </>
      )}

      {/* =====================================================
          SECURITY MODE
      ===================================================== */}
      {mode === 'SECURITY' &&
        selectedTransaction && (
          <section className="security-dashboard">

            {/* SECURITY HEADER */}
            <div className="security-header">

              <div>
                <h2>
                  Security Analysis
                </h2>

                <p>
                  Transaction{' '}
                  <strong>
                    {selectedTransaction.id}
                  </strong>
                </p>
              </div>

              <button
                onClick={() => setMode('USER')}
              >
                ← Back to User Mode
              </button>

            </div>

            {/* =================================================
                SECURITY SUMMARY
            ================================================= */}
            <div className="security-summary">

              {/* SECURITY SCORE */}
              <div className="security-score-large">

                <span>
                  Security Score
                </span>

                <strong>
                  {analysis?.securityScore ??
                    'Not Analyzed'}

                  {analysis?.securityScore
                    ? '/100'
                    : ''}
                </strong>

              </div>

              {/* TRANSACTION STATUS */}
              <div>

                <span>
                  Transaction Status
                </span>

                <strong>
                  {selectedTransaction.status ||
                    'Completed'}
                </strong>

              </div>

              {/* RISK LEVEL */}
              <div>

                <span>
                  Risk Level
                </span>

                <strong>
                  {analysis?.riskLevel ||
                    'Not Analyzed'}
                </strong>

              </div>

            </div>

            {/* =================================================
                TRANSACTION DETAILS
            ================================================= */}
            <div className="transaction-details">

              <h3>
                Transaction Details
              </h3>

              <div className="details-grid">

                {/* TRANSACTION ID */}
                <div>

                  <span>
                    Transaction ID
                  </span>

                  <strong>
                    {selectedTransaction.id}
                  </strong>

                </div>

                {/* SENDER */}
                <div>

                  <span>
                    Sender
                  </span>

                  <strong>
                    {selectedTransaction.sender ||
                      'sripad@upi'}
                  </strong>

                </div>

                {/* RECEIVER */}
                <div>

                  <span>
                    Receiver
                  </span>

                  <strong>
                    {selectedTransaction.receiverUpi ||
                      selectedTransaction.receiver ||
                      'Unknown'}
                  </strong>

                </div>

                {/* AMOUNT */}
                <div>

                  <span>
                    Amount
                  </span>

                  <strong>
                    ₹
                    {Number(
                      selectedTransaction.amount || 0
                    ).toFixed(2)}
                  </strong>

                </div>

              </div>
            </div>

            {/* =================================================
                AI SECURITY ANALYSIS
            ================================================= */}
            {!analysis && (
              <div className="security-tests">

                <h3>
                  Security Analysis
                </h3>

                <p>
                  This transaction has not been
                  analyzed by Gemini AI yet.
                </p>

                <p>
                  Complete a payment to generate
                  an AI-powered security analysis.
                </p>

              </div>
            )}

            {/* =================================================
                AI ANALYSIS AVAILABLE
            ================================================= */}
            {analysis && (
              <>

                {/* AI EXPLANATION */}
                <div className="security-tests">

                  <h3>
                    Gemini AI Security Analysis
                  </h3>

                  {analysis.explanation ? (
                    <p>
                      {analysis.explanation}
                    </p>
                  ) : (
                    <p>
                      No explanation provided.
                    </p>
                  )}

                </div>

                {/* =================================================
                    VULNERABILITIES
                ================================================= */}
                <div className="security-tests">

                  <h3>
                    Detected Vulnerabilities
                  </h3>

                  {Array.isArray(
                    analysis.vulnerabilities
                  ) &&
                  analysis.vulnerabilities.length >
                    0 ? (

                    <ul>

                      {analysis.vulnerabilities.map(
                        (vulnerability, index) => (

                          <li key={index}>

                            {typeof vulnerability ===
                            'string'
                              ? vulnerability
                              : vulnerability?.name ||
                                JSON.stringify(
                                  vulnerability
                                )}

                          </li>

                        )
                      )}

                    </ul>

                  ) : (

                    <p>
                      No vulnerabilities detected.
                    </p>

                  )}

                </div>

                {/* =================================================
                    RECOMMENDATIONS
                ================================================= */}
                <div className="security-tests">

                  <h3>
                    Security Recommendations
                  </h3>

                  {Array.isArray(
                    analysis.recommendations
                  ) &&
                  analysis.recommendations.length >
                    0 ? (

                    <ul>

                      {analysis.recommendations.map(
                        (recommendation, index) => (

                          <li key={index}>
                            {recommendation}
                          </li>

                        )
                      )}

                    </ul>

                  ) : (

                    <p>
                      No additional recommendations.
                    </p>

                  )}

                </div>

              </>
            )}

          </section>
        )}

    </div>
  );
}

