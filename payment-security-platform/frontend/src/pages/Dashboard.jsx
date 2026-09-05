import React, { useEffect, useState } from 'react';
import StatCard from '../components/StatCard';
import SecurityScore from '../components/SecurityScore';
import TransactionTable from '../components/TransactionTable';
import { api } from '../services/api';

export default function Dashboard() {
  const [mode, setMode] = useState('USER');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  // =============================
  // LOAD TRANSACTIONS
  // =============================
  const loadTransactions = async () => {
    try {
      let txList = [];
      try {
        const allRes = await api.getAllTransactions();
        if (Array.isArray(allRes?.transactions)) {
          txList = allRes.transactions;
        } else if (Array.isArray(allRes)) {
          txList = allRes;
        }
      } catch {
        const myRes = await api.getMyTransactions();
        if (Array.isArray(myRes?.transactions)) {
          txList = myRes.transactions;
        } else if (Array.isArray(myRes)) {
          txList = myRes;
        }
      }

      // Format raw transactions to ensure consistency
      const normalizedList = txList.map((tx) => ({
        ...tx,
        id: tx.id || tx.transactionId || tx.transaction_id || 'N/A',
        sender: tx.sender || tx.senderUpi || tx.sender_upi || tx.senderUserId || 'userA@upi',
        receiver: tx.receiver || tx.receiverUpi || tx.receiver_upi || tx.receiverName || 'Unknown',
        amount: Number(tx.amount || 0),
        status: String(tx.status || 'COMPLETED').toUpperCase(),
      }));

      setTransactions(normalizedList);

      setSelectedTransaction((current) => {
        if (!current && normalizedList.length > 0) return normalizedList[0];
        if (!current) return null;
        return normalizedList.find((tx) => tx.id === current.id) || current;
      });
    } catch (error) {
      console.error('Failed to load server transactions:', error);
      setTransactions([]);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  // =============================
  // TRIGGER SECURITY ANALYSIS
  // =============================
  const handleAnalyzeTransaction = async (txObj) => {
    if (!txObj) return;
    setIsAnalyzing(true);
    setAnalysisError('');

    try {
      const apiResponsePayload = {
        statusCode: 200,
        statusMessage: 'Transaction Retrieved and Submitted for Analysis',
        timestamp: new Date().toISOString(),
      };

      const res = await api.analyzeSecurity(txObj, apiResponsePayload);

      if (res && res.success && res.analysis) {
        const updatedTx = {
          ...txObj,
          securityAnalysis: res.analysis,
        };

        setSelectedTransaction(updatedTx);
        setTransactions((prev) =>
          prev.map((t) => (t.id === txObj.id ? updatedTx : t))
        );
      } else {
        throw new Error('Analysis response was incomplete.');
      }
    } catch (err) {
      console.error('Security analysis error:', err);
      setAnalysisError(
        err.response?.data?.error ||
          err.message ||
          'Failed to perform AI Security Analysis.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // =============================
  // SELECT TRANSACTION
  // =============================
  const handleViewSecurity = (transaction) => {
    setSelectedTransaction(transaction);
    setMode('SECURITY');
    setAnalysisError('');
  };

  // =============================
  // GET SECURITY ANALYSIS
  // =============================
  const analysis = selectedTransaction?.securityAnalysis || null;

  // =============================
  // SECURITY MODE
  // =============================
  const handleSecurityMode = () => {
    if (transactions.length > 0) {
      if (!selectedTransaction) {
        setSelectedTransaction(transactions[0]);
      }
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
          <p>Payment activity and API security monitoring</p>
        </div>

        <div className="mode-toggle">
          {/* USER MODE */}
          <button
            className={mode === 'USER' ? 'active' : ''}
            onClick={() => setMode('USER')}
          >
            User Mode
          </button>

          {/* SECURITY MODE */}
          <button
            className={mode === 'SECURITY' ? 'active security' : ''}
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
            <StatCard title="Overall Security Score" value="82/100" />
            <StatCard title="APIs Scanned" value="12" />
            <StatCard title="Vulnerabilities Found" value="5" />
            <StatCard title="Critical Vulnerabilities" value="1" />
          </div>

          {/* SECURITY SCORE */}
          <SecurityScore score={82} />

          {/* RECENT SECURITY SCANS */}
          <section className="dashboard-section">
            <h2>Recent Security Scans</h2>
            <p>/api/auth/login - 2 issues</p>
          </section>

          {/* VULNERABILITY SUMMARY */}
          <section className="dashboard-section">
            <h2>Vulnerability Summary</h2>
            <p>1 Critical, 2 High, 2 Medium</p>
          </section>

          {/* PAYMENT TRANSACTIONS */}
          <section className="dashboard-section">
            <h2>Recent Payment Transactions</h2>
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
      {mode === 'SECURITY' && selectedTransaction && (
        <section className="security-dashboard">

          {/* SECURITY HEADER */}
          <div className="security-header">
            <div>
              <h2>Security Analysis</h2>
              <p>
                Transaction <strong>{selectedTransaction.id}</strong>
              </p>
            </div>

            <button onClick={() => setMode('USER')}>
              Security monitoring active
            </button>
          </div>

          {/* =================================================
              SECURITY SUMMARY
          ================================================= */}
          <div className="security-summary">
            {/* SECURITY SCORE */}
            <div className="security-score-large">
              <span>Security Score</span>
              <strong>
                {analysis?.securityScore ?? 'Not Analyzed'}
                {analysis?.securityScore ? '/100' : ''}
              </strong>
            </div>

            {/* TRANSACTION STATUS */}
            <div>
              <span>Transaction Status</span>
              <strong>{selectedTransaction.status || 'COMPLETED'}</strong>
            </div>

            {/* RISK LEVEL */}
            <div>
              <span>Risk Level</span>
              <strong>{analysis?.riskLevel || 'Not Analyzed'}</strong>
            </div>
          </div>

          {/* =================================================
              TRANSACTION DETAILS
          ================================================= */}
          <div className="transaction-details">
            <h3>Transaction Details</h3>

            <div className="details-grid">
              {/* TRANSACTION ID */}
              <div>
                <span>Transaction ID</span>
                <strong>{selectedTransaction.id}</strong>
              </div>

              {/* SENDER */}
              <div>
                <span>Sender</span>
                <strong>{selectedTransaction.sender}</strong>
              </div>

              {/* RECEIVER */}
              <div>
                <span>Receiver</span>
                <strong>{selectedTransaction.receiver}</strong>
              </div>

              {/* AMOUNT */}
              <div>
                <span>Amount</span>
                <strong>
                  ₹{Number(selectedTransaction.amount || 0).toFixed(2)}
                </strong>
              </div>
            </div>
          </div>

          {/* =================================================
              NO SECURITY ANALYSIS YET
          ================================================= */}
          {!analysis && (
            <div className="security-tests">
              <h3>Security Analysis</h3>
              <p>
                This transaction has not been analyzed by SecurePay AI Security Engine yet.
              </p>
              {analysisError && (
                <p style={{ color: '#ef4444', fontWeight: 'bold' }}>
                  {analysisError}
                </p>
              )}
              <button
                style={{
                  marginTop: '12px',
                  padding: '10px 18px',
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
                disabled={isAnalyzing}
                onClick={() => handleAnalyzeTransaction(selectedTransaction)}
              >
                {isAnalyzing ? 'Analyzing Transaction...' : 'Analyze Transaction'}
              </button>
            </div>
          )}

          {/* =================================================
              AI ANALYSIS AVAILABLE
          ================================================= */}
          {analysis && (
            <>
              {/* AI EXPLANATION */}
              <div className="security-tests">
                <h3>Gemini AI Security Explanation</h3>
                {analysis.explanation ? (
                  <p>{analysis.explanation}</p>
                ) : (
                  <p>No explanation provided.</p>
                )}
              </div>

              {/* =================================================
                  VULNERABILITIES
              ================================================= */}
              <div className="security-tests">
                <h3>Detected Vulnerabilities</h3>
                {Array.isArray(analysis.vulnerabilities) &&
                analysis.vulnerabilities.length > 0 ? (
                  <ul>
                    {analysis.vulnerabilities.map((vulnerability, index) => (
                      <li key={index}>
                        {typeof vulnerability === 'string'
                          ? vulnerability
                          : vulnerability?.name || JSON.stringify(vulnerability)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No vulnerabilities detected.</p>
                )}
              </div>

              {/* =================================================
                  RECOMMENDATIONS
              ================================================= */}
              <div className="security-tests">
                <h3>Security Recommendations</h3>
                {Array.isArray(analysis.recommendations) &&
                analysis.recommendations.length > 0 ? (
                  <ul>
                    {analysis.recommendations.map((recommendation, index) => (
                      <li key={index}>{recommendation}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No additional recommendations.</p>
                )}
              </div>
            </>
          )}

        </section>
      )}

    </div>
  );
}
