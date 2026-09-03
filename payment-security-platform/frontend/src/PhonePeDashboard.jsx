import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import './PhonePeDashboard.css';

import {
  QrCode,
  Bell,
  HelpCircle,
  User,
  Send,
  Building,
  Smartphone,
  Wallet,
  ArrowLeftRight,
  CreditCard,
  Home,
  History,
  Shield,
  SmartphoneCharging,
  Tv,
  Fuel,
  ChevronRight,
  CheckCircle,
  Clock,
  XCircle,
  Lock,
  IndianRupee,
  Eye,
  EyeOff,
  ArrowUpRight,
  X,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

const STORAGE_KEY_PREFIX = 'securepay_dashboard_state_';

const INITIAL_BALANCE = 24580.75;
const INITIAL_RECEIVER_ACCOUNTS = {
  'rahul@upi': {
    name: 'Rahul Kumar',
    balance: 5000,
  },
  'sbi@upi': {
    name: 'SBI Bank',
    balance: 25000,
  },
};
const INITIAL_TRANSACTIONS = [
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

const loadSavedState = (storageKey) => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse saved state from localStorage:', err);
    return null;
  }
};

export default function PhonePeDashboard() {
  // =============================
  // =============================
  // USER IDENTITY
  // =============================

  let savedUser = {};

  try {
    savedUser = JSON.parse(
      localStorage.getItem('paymentUser')
    ) || {};
  } catch {
    savedUser = {};
  }

  const user = {
    name: savedUser.name || 'User',

    mobile: savedUser.phone
      ? `${savedUser.phone.slice(
          0,
          2
        )}******${savedUser.phone.slice(-2)}`
      : 'Not available',

    email: savedUser.email || 'Not available',
  };

  // STATE
  // =============================

  // Create a unique storage key for each logged-in user
  const userIdentifier =
    savedUser.email ||
    savedUser.phone ||
    savedUser.name ||
    'default-user';

  const userStorageId = String(userIdentifier)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');

  const STORAGE_KEY = `${STORAGE_KEY_PREFIX}${userStorageId}`;
  const savedState = loadSavedState(STORAGE_KEY);

  const [activeTab, setActiveTab] = useState('home');
  const [showBalance, setShowBalance] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerMessage, setScannerMessage] = useState('');
  const scannerRef = useRef(null);

  const [form, setForm] = useState({
    receiver: '',
    amount: '',
  });

  const [message, setMessage] = useState('');

  const [balance, setBalance] = useState(() => {
    return typeof savedState?.balance === 'number'
      ? savedState.balance
      : INITIAL_BALANCE;
  });

  const [receiverAccounts, setReceiverAccounts] = useState(() => {
    return savedState?.receiverAccounts || INITIAL_RECEIVER_ACCOUNTS;
  });

  // AI Security Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysisError, setAiAnalysisError] = useState(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);

  // =============================
  // TRANSACTIONS
  // =============================

  const [transactions, setTransactions] = useState(() => {
    return Array.isArray(savedState?.transactions)
      ? savedState.transactions
      : INITIAL_TRANSACTIONS;
  });

  useEffect(() => {
    try {
      const payload = {
        balance,
        transactions,
        receiverAccounts,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn('Failed to save state to localStorage:', err);
    }
  }, [balance, transactions, receiverAccounts]);

  // =============================
  // USER
  // =============================



  // =============================
  // BANK
  // =============================

  const bank = {
    name: 'State Bank of India',
    account: 'XXXX 4582',
  };

  const securityScore = aiAnalysisResult?.securityScore ?? 82;

  const myUpiId = savedUser.upiId || `${String(userIdentifier).split('@')[0].toLowerCase()}@upi`;

  // =============================
  // UPI VALIDATION
  // =============================

  const isValidUpi = (upi) => {
    const upiRegex =
      /^[a-zA-Z0-9._-]{2,50}@[a-zA-Z0-9.-]{2,50}$/;

    return upiRegex.test(upi.trim());
  };

  // =============================
  // AI SECURITY ANALYSIS
  // =============================

  const analyzeTransactionSecurity = async (tx, apiResponsePayload) => {
    setIsAnalyzing(true);
    setAiAnalysisError(null);

    try {
      const res = await fetch('http://localhost:5002/api/analyze-security', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction: tx,
          apiResponse: apiResponsePayload,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status code ${res.status}`);
      }

      const data = await res.json();

      if (data && data.success && data.analysis) {
        setAiAnalysisResult(data.analysis);

        // Attach analysis to transaction in state
        setTransactions((prev) =>
          prev.map((t) =>
            t.id === tx.id ? { ...t, securityAnalysis: data.analysis } : t
          )
        );
      } else {
        throw new Error('Invalid analysis response format received.');
      }
    } catch (err) {
      console.error('Security analysis error:', err);
      setAiAnalysisError(
        'AI Security Backend is currently unavailable. Ensure localhost:5002 is running.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // =============================
  // QR SCANNER
  // =============================

  const extractUpiDetails = (qrText) => {
    try {
      const text = String(qrText || '').trim();

      if (!text.toLowerCase().startsWith('upi://pay')) {
        return null;
      }

      const url = new URL(text);
      const upiId = url.searchParams.get('pa');
      const encodedName = url.searchParams.get('pn');

      if (!upiId || !isValidUpi(upiId)) {
        return null;
      }

      let name = upiId.split('@')[0];

      if (encodedName) {
        try {
          name = decodeURIComponent(encodedName);
        } catch {
          name = encodedName;
        }
      }

      return { upiId, name };
    } catch {
      return null;
    }
  };

  const stopQRScanner = async () => {
    const scanner = scannerRef.current;

    try {
      if (scanner) {
        if (scanner.isScanning) {
          await scanner.stop();
        }

        await scanner.clear();
      }
    } catch (error) {
      console.warn('QR scanner cleanup:', error);
    } finally {
      scannerRef.current = null;
      setShowScanner(false);
    }
  };

  const startQRScanner = () => {
    setScannerMessage('');
    setShowScanner(true);

    window.setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          async (decodedText) => {
            const details = extractUpiDetails(decodedText);

            if (!details) {
              setScannerMessage(
                'Invalid UPI QR. Please scan a valid UPI payment QR.'
              );
              return;
            }

            try {
              if (scanner.isScanning) {
                await scanner.stop();
              }

              await scanner.clear();
            } catch (error) {
              console.warn('QR scanner stop:', error);
            } finally {
              scannerRef.current = null;
            }

            setForm((prev) => ({
              ...prev,
              receiver: details.upiId,
            }));

            setScannerMessage(
              `QR scanned successfully. ${details.name} â€¢ ${details.upiId}`
            );

            setShowScanner(false);
            setActiveTab('pay');
          },
          () => {
            // Decode misses are normal while scanning.
          }
        );
      } catch (error) {
        console.error('QR scanner error:', error);
        setScannerMessage(
          'Camera access failed. Allow camera permission and try again.'
        );
      }
    }, 250);
  };

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;

      if (scanner) {
        scanner
          .stop()
          .catch(() => {})
          .finally(() => {
            scanner.clear().catch(() => {});
          });
      }
    };
  }, []);

  // =============================
  // PAYMENT
  // =============================

  const handlePayment = (e) => {
    e.preventDefault();

    setMessage('');

    const receiver = form.receiver.trim();

    if (!receiver) {
      setMessage('Please enter a UPI ID.');
      return;
    }

    if (!isValidUpi(receiver)) {
      setMessage(
        'Invalid UPI ID. Example: rahul@upi'
      );
      return;
    }

    if (
      receiver.toLowerCase() ===
      myUpiId.toLowerCase()
    ) {
      setMessage(
        'You cannot make a payment to your own UPI ID.'
      );
      return;
    }

    if (!form.amount) {
      setMessage('Please enter an amount.');
      return;
    }

    const amount = Number(form.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage(
        'Amount must be greater than â‚¹0.'
      );
      return;
    }

    if (amount > 10000000) {
      setMessage(
        'Security warning: unusually large amount detected.'
      );
      return;
    }

    if (amount > balance) {
      setMessage(
        'Insufficient bank balance.'
      );
      return;
    }

    const normalizedUpi =
      receiver.toLowerCase();

    let receiverName = receiver;

    if (receiverAccounts[normalizedUpi]) {
      receiverName =
        receiverAccounts[normalizedUpi].name;

      setReceiverAccounts((prev) => ({
        ...prev,

        [normalizedUpi]: {
          ...prev[normalizedUpi],
          balance:
            prev[normalizedUpi].balance +
            amount,
        },
      }));
    } else {
      setReceiverAccounts((prev) => ({
        ...prev,

        [normalizedUpi]: {
          name: receiver.split('@')[0],
          balance: amount,
        },
      }));
    }

    setBalance((prev) => prev - amount);

    const newTransaction = {
      id: `TX-${String(
        transactions.length + 1
      ).padStart(3, '0')}`,

      receiver: receiverName,
      receiverUpi: receiver,
      amount,
      status: 'Completed',
      date: 'Just now',
    };

    setTransactions((prev) => [
      newTransaction,
      ...prev,
    ]);

    setForm({
      receiver: '',
      amount: '',
    });

    setMessage(
      `Payment of â‚¹${amount.toFixed(
        2
      )} sent successfully to ${receiver}.`
    );

    // Analyze transaction via AI Backend
    analyzeTransactionSecurity(newTransaction, {
      statusCode: 200,
      statusMessage: 'Payment Processed Successfully',
      timestamp: new Date().toISOString(),
    });
  };

  // =============================
  // STATUS ICON
  // =============================

  const statusIcon = (status) => {
    if (status === 'Completed') {
      return <CheckCircle size={18} />;
    }

    if (status === 'Pending') {
      return <Clock size={18} />;
    }

    return <XCircle size={18} />;
  };

  // =============================
  // STATUS CLASS
  // =============================

  const statusClass = (status) => {
    if (status === 'Completed') {
      return 'payment-status completed';
    }

    if (status === 'Pending') {
      return 'payment-status pending';
    }

    return 'payment-status failed';
  };

  // =============================
  // HOME
  // =============================

  const renderHome = () => (
    <>
      <section className="phonepe-card">
        <div className="section-heading">
          <h2>Transfer Money</h2>
          <span>Quick Pay</span>
        </div>

        <div className="quick-actions">
          <button
            type="button"
            onClick={() => setActiveTab('pay')}
            className="quick-action"
          >
            <div className="quick-icon">
              <Smartphone size={21} />
            </div>
            <span>To Mobile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pay')}
            className="quick-action"
          >
            <div className="quick-icon">
              <Building size={21} />
            </div>
            <span>To Bank / UPI</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pay')}
            className="quick-action"
          >
            <div className="quick-icon">
              <ArrowLeftRight size={21} />
            </div>
            <span>To Self</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bank')}
            className="quick-action"
          >
            <div className="quick-icon">
              <IndianRupee size={21} />
            </div>
            <span>Balance</span>
          </button>

          <button
            type="button"
            onClick={startQRScanner}
            className="quick-action"
          >
            <div className="quick-icon">
              <QrCode size={21} />
            </div>
            <span>Scan QR</span>
          </button>
        </div>
      </section>

      <section className="security-card">
        <div className="security-card-icon">
          <Shield size={22} />
        </div>

        <div className="security-card-content">
          <p className="security-card-title">
            Your Security Score
          </p>

          <p className="security-card-description">
            Your account is being monitored for
            payment security.
          </p>
        </div>

        <div className="security-score-number">
          {securityScore}
          <span>/100</span>
        </div>
      </section>

      <section className="wallet-banner">
        <div className="wallet-icon">
          <Wallet size={21} />
        </div>

        <div className="wallet-content">
          <strong>SecurePay Wallet</strong>
          <span>Fast and secure payments</span>
        </div>

        <button type="button">
          Add Money
        </button>
      </section>

      <section className="phonepe-card">
        <div className="section-heading">
          <h2>Recharge &amp; Pay Bills</h2>
          <ChevronRight size={18} />
        </div>

        <div className="bill-grid">
          <button type="button">
            <Smartphone
              className="bill-icon"
              size={24}
            />
            <span>Mobile</span>
          </button>

          <button type="button">
            <Tv
              className="bill-icon"
              size={24}
            />
            <span>DTH</span>
          </button>

          <button type="button">
            <SmartphoneCharging
              className="bill-icon"
              size={24}
            />
            <span>Electricity</span>
          </button>

          <button type="button">
            <CreditCard
              className="bill-icon"
              size={24}
            />
            <span>Credit Card</span>
          </button>

          <button type="button">
            <Fuel
              className="bill-icon"
              size={24}
            />
            <span>Fuel</span>
          </button>

          <button type="button">
            <Shield
              className="bill-icon"
              size={24}
            />
            <span>Insurance</span>
          </button>

          <button type="button">
            <Wallet
              className="bill-icon"
              size={24}
            />
            <span>Wallet</span>
          </button>

          <button type="button">
            <ArrowUpRight
              className="bill-icon"
              size={24}
            />
            <span>More</span>
          </button>
        </div>
      </section>

      <section className="phonepe-card">
        <div className="section-heading">
          <h2>Recent Payments</h2>

          <button
            type="button"
            className="view-all-button"
            onClick={() =>
              setActiveTab('history')
            }
          >
            View All
          </button>
        </div>

        <div className="recent-list">
          {transactions
            .slice(0, 3)
            .map((tx) => (
              <div
                className="recent-item"
                key={tx.id}
              >
                <div className="recent-avatar">
                  <Send size={17} />
                </div>

                <div className="recent-info">
                  <strong>
                    {tx.receiver}
                  </strong>

                  <span>{tx.date}</span>
                </div>

                <div className="recent-amount">
                  <strong>
                    â‚¹{tx.amount.toFixed(2)}
                  </strong>

                  <span
                    className={statusClass(
                      tx.status
                    )}
                  >
                    {statusIcon(tx.status)}
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </section>
    </>
  );

  // =============================
  // PAY
  // =============================

  const renderPay = () => (
    <section className="phonepe-card pay-section">
      <div className="page-title-row">
        <div>
          <h2>Send Money</h2>
          <p>Make a secure mock payment</p>
        </div>

        <div className="secure-badge">
          <Lock size={14} />
          Secure
        </div>
      </div>

      <form
        onSubmit={handlePayment}
        className="payment-form"
      >
        <label>
          Receiver UPI ID

          <div className="upi-input-row">
            <input
              type="text"
              placeholder="e.g. rahul@upi"
              value={form.receiver}
              onChange={(e) =>
                setForm({
                  ...form,
                  receiver: e.target.value,
                })
              }
            />

            <button
              type="button"
              className="scan-qr-button"
              onClick={startQRScanner}
            >
              <QrCode size={18} />
              Scan QR
            </button>
          </div>
        </label>

        <label>
          Amount

          <div className="amount-input">
            <IndianRupee size={20} />

            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Enter amount"
              value={form.amount}
              onChange={(e) =>
                setForm({
                  ...form,
                  amount: e.target.value,
                })
              }
            />
          </div>
        </label>

        <div className="available-balance">
          Available balance:

          <strong>
            â‚¹
            {balance.toLocaleString(
              'en-IN',
              {
                minimumFractionDigits: 2,
              }
            )}
          </strong>
        </div>

        <button
          className="send-payment-button"
          type="submit"
          disabled={isAnalyzing}
        >
          <Send size={19} />
          {isAnalyzing ? 'Analyzing...' : 'Pay Securely'}
        </button>

        {message && (
          <div className="payment-message">
            <CheckCircle size={18} />
            {message}
          </div>
        )}
      </form>

      <div className="security-notice">
        <Shield size={18} />

        <div>
          <strong>
            Security Monitoring Enabled
          </strong>

          <p>
            Every payment can be analyzed later
            in Security Mode for authentication,
            authorization, input validation,
            replay attacks and other API
            security checks.
          </p>
        </div>
      </div>
    </section>
  );

  // =============================
  // HISTORY
  // =============================

  const renderHistory = () => (
    <section className="phonepe-card">
      <div className="page-title-row">
        <div>
          <h2>Payment History</h2>
          <p>Your recent transactions</p>
        </div>

        <History size={24} />
      </div>

      <div className="history-list">
        {transactions.map((tx) => (
          <div
            className="history-item"
            key={tx.id}
          >
            <div className="history-left">
              <div className="history-icon">
                <Send size={18} />
              </div>

              <div>
                <strong>{tx.receiver}</strong>

                <span>{tx.receiverUpi}</span>

                <span>{tx.id}</span>

                <small>{tx.date}</small>
              </div>
            </div>

            <div className="history-right">
              <strong>
                â‚¹{tx.amount.toFixed(2)}
              </strong>

              <span
                className={statusClass(
                  tx.status
                )}
              >
                {statusIcon(tx.status)}
                {tx.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  // =============================
  // BANK
  // =============================

  const renderBank = () => (
    <section className="phonepe-card">
      <div className="page-title-row">
        <div>
          <h2>Bank Accounts</h2>
          <p>
            Linked accounts and balances
          </p>
        </div>

        <Building size={24} />
      </div>

      <div className="bank-account-card">
        <div className="bank-logo">
          <Building size={25} />
        </div>

        <div className="bank-details">
          <strong>{bank.name}</strong>

          <span>
            Primary Account â€¢ {bank.account}
          </span>
        </div>

        <div className="bank-balance">
          <small>Available</small>

          <strong>
            â‚¹
            {balance.toLocaleString(
              'en-IN',
              {
                minimumFractionDigits: 2,
              }
            )}
          </strong>
        </div>
      </div>

      <div className="bank-security-info">
        <Shield size={20} />

        <div>
          <strong>
            Bank connection secured
          </strong>

          <p>
            This is a simulated bank account
            for your college project.
            No real banking information
            is used.
          </p>
        </div>
      </div>

      <div className="bank-security-info">
        <Wallet size={20} />

        <div>
          <strong>
            Dummy Receiver Accounts
          </strong>

          {Object.entries(
            receiverAccounts
          ).map(([upi, account]) => (
            <p key={upi}>
              <strong>{upi}</strong>
              {' â€” '}
              â‚¹
              {account.balance.toLocaleString(
                'en-IN',
                {
                  minimumFractionDigits: 2,
                }
              )}
            </p>
          ))}
        </div>
      </div>
    </section>
  );

  // =============================
  // SECURITY
  // =============================

  const renderSecurity = () => (
    <section className="phonepe-card security-page">
      <div className="page-title-row">
        <div>
          <h2>Security Center</h2>

          <p>
            Monitor your payment security &amp; Gemini AI Analysis
          </p>
        </div>

        <div className="secure-badge">
          <Shield size={15} />
          Protected
        </div>
      </div>

      {isAnalyzing && (
        <div className="security-info-box" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
          <Loader2 size={20} className="animate-spin" style={{ color: '#16a34a' }} />
          <div>
            <strong>Analyzing Security...</strong>
            <p>Gemini AI is scanning your payment transaction for potential threats.</p>
          </div>
        </div>
      )}

      {aiAnalysisError && (
        <div className="security-info-box" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
          <AlertTriangle size={20} style={{ color: '#dc2626' }} />
          <div>
            <strong>AI Backend Warning</strong>
            <p>{aiAnalysisError}</p>
          </div>
        </div>
      )}

      <div className="security-overview-card">
        <div className="security-overview-icon">
          <Shield size={28} />
        </div>

        <div>
          <span>
            Your Security Score
          </span>

          <strong>
            {securityScore}/100
          </strong>

          <p>
            {aiAnalysisResult?.riskLevel
              ? `Risk Level: ${aiAnalysisResult.riskLevel}`
              : 'Good security posture'}
          </p>
        </div>
      </div>

      {aiAnalysisResult && (
        <div className="phonepe-card" style={{ marginTop: '16px', border: '1px solid #e2e8f0' }}>
          <h3 className="security-section-title" style={{ marginTop: 0 }}>
            Gemini AI Security Insights
          </h3>

          {aiAnalysisResult.explanation && (
            <div style={{ marginBottom: '12px' }}>
              <strong>AI Analysis Explanation:</strong>
              <p style={{ margin: '4px 0', fontSize: '14px', color: '#475569' }}>
                {aiAnalysisResult.explanation}
              </p>
            </div>
          )}

          {Array.isArray(aiAnalysisResult.vulnerabilities) &&
            aiAnalysisResult.vulnerabilities.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <strong>Detected Vulnerabilities:</strong>
                <ul style={{ paddingLeft: '20px', margin: '4px 0', fontSize: '14px', color: '#dc2626' }}>
                  {aiAnalysisResult.vulnerabilities.map((vuln, idx) => (
                    <li key={idx}>{typeof vuln === 'string' ? vuln : vuln.name || JSON.stringify(vuln)}</li>
                  ))}
                </ul>
              </div>
            )}

          {Array.isArray(aiAnalysisResult.recommendations) &&
            aiAnalysisResult.recommendations.length > 0 && (
              <div>
                <strong>Recommendations:</strong>
                <ul style={{ paddingLeft: '20px', margin: '4px 0', fontSize: '14px', color: '#16a34a' }}>
                  {aiAnalysisResult.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      )}

      <div className="security-info-box">
        <Shield size={20} />

        <div>
          <strong>
            How SecurePay protects you
          </strong>

          <p>
            Every payment is monitored for
            authentication, authorization,
            amount manipulation, replay attacks
            and unusual activity.
          </p>
        </div>
      </div>

      <h3 className="security-section-title">
        Recent Payment Security
      </h3>

      <div className="security-transaction-list">
        {transactions.map((tx) => {
          const security =
            tx.id === 'TX-002'
              ? {
                  score: 68,
                  result: 'Warning',
                  issue:
                    'Repeated transaction detected',
                }
              : {
                  score: securityScore,
                  result: 'Passed',
                  issue:
                    'No security issues detected',
                };

          return (
            <div
              className="security-transaction"
              key={tx.id}
            >
              <div className="security-transaction-top">
                <div>
                  <strong>
                    {tx.receiver}
                  </strong>

                  <span>
                    {tx.receiverUpi}
                  </span>

                  <span>{tx.id}</span>
                </div>

                <div className="security-score-small">
                  {security.score}/100
                </div>
              </div>

              <div className="security-result">
                <span
                  className={
                    security.result ===
                    'Passed'
                      ? 'security-pass'
                      : 'security-warning'
                  }
                >
                  {security.result ===
                  'Passed'
                    ? 'âœ“ Security Passed'
                    : 'âš  Security Warning'}
                </span>

                <p>{security.issue}</p>
              </div>

              <div className="security-tests-mini">
                <span>
                  âœ“ Authentication
                </span>

                <span>
                  âœ“ Authorization
                </span>

                <span>
                  âœ“ Amount Validation
                </span>

                <span>
                  {security.result ===
                  'Passed'
                    ? 'âœ“ Replay Protection'
                    : 'âš  Replay Detection'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );

  // =============================
  // MAIN RETURN
  // =============================

  return (
    <div className="phonepe-app">

      {/* HEADER */}

      <header className="phonepe-header">
        <div className="phonepe-profile">
          <div className="phonepe-avatar">
            <User size={20} />
          </div>

          <div>
            <p className="phonepe-small-text">
              Welcome back
            </p>

            <p className="phonepe-user-name">
              {user.name}
            </p>

            <p className="phonepe-small-text">
              {user.mobile}
            </p>
          </div>
        </div>

        <div className="phonepe-header-actions">

          {/* QR BUTTON */}

          <button
            type="button"
            onClick={() => setShowQR(true)}
            title="My UPI QR"
          >
            <QrCode size={21} />
          </button>

          <button type="button">
            <Bell size={21} />
          </button>

          <button type="button">
            <HelpCircle size={21} />
          </button>
        </div>
      </header>

      {/* BALANCE */}

      <section className="balance-card">
        <div className="balance-top">
          <div>
            <p className="balance-label">
              Available Balance
            </p>

            <div className="balance-value">
              {showBalance
                ? `â‚¹${balance.toLocaleString(
                    'en-IN',
                    {
                      minimumFractionDigits: 2,
                    }
                  )}`
                : 'â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢'}
            </div>

            <p className="balance-account">
              {bank.name} â€¢ {bank.account}
            </p>
          </div>

          <button
            type="button"
            className="balance-eye"
            onClick={() =>
              setShowBalance(
                !showBalance
              )
            }
          >
            {showBalance ? (
              <EyeOff size={19} />
            ) : (
              <Eye size={19} />
            )}
          </button>
        </div>

        <div className="balance-security">
          <Shield size={16} />

          <span>
            Protected by SecurePay
          </span>
        </div>
      </section>

      {/* CONTENT */}

      <main className="phonepe-main">
        {activeTab === 'home' &&
          renderHome()}

        {activeTab === 'pay' &&
          renderPay()}

        {activeTab === 'history' &&
          renderHistory()}

        {activeTab === 'bank' &&
          renderBank()}

        {activeTab === 'security' &&
          renderSecurity()}
      </main>

      {/* BOTTOM NAVIGATION */}

      <nav className="phonepe-bottom-nav">

        <button
          type="button"
          onClick={() =>
            setActiveTab('home')
          }
          className={
            activeTab === 'home'
              ? 'active'
              : ''
          }
        >
          <Home size={21} />
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveTab('pay')
          }
          className={
            activeTab === 'pay'
              ? 'active'
              : ''
          }
        >
          <Send size={21} />
          <span>Pay</span>
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveTab('history')
          }
          className={
            activeTab === 'history'
              ? 'active'
              : ''
          }
        >
          <History size={21} />
          <span>History</span>
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveTab('bank')
          }
          className={
            activeTab === 'bank'
              ? 'active'
              : ''
          }
        >
          <Building size={21} />
          <span>Bank</span>
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveTab('security')
          }
          className={
            activeTab === 'security'
              ? 'active'
              : ''
          }
        >
          <Shield size={21} />
          <span>Security</span>
        </button>
      </nav>

      {/* QR MODAL */}

      {showQR && (
        <div
          className="qr-modal-overlay"
          onClick={() =>
            setShowQR(false)
          }
        >
          <div
            className="qr-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <button
              type="button"
              className="qr-close"
              onClick={() =>
                setShowQR(false)
              }
            >
              <X size={20} />
            </button>

            <h2>My UPI QR</h2>

            <p>Scan to pay</p>

            <div className="qr-code-container">
              <QRCodeSVG
                value={`upi://pay?pa=${myUpiId}&pn=${encodeURIComponent(
                  user.name
                )}`}
                size={220}
                level="H"
                includeMargin={true}
              />
            </div>

            <strong className="qr-upi-id">
              {myUpiId}
            </strong>

            <span className="qr-user-name">
              {user.name}
            </span>

            <p className="qr-note">
              This is a dummy UPI QR used
              for the SecurePay college
              project.
            </p>
          </div>
        </div>
      )}

      {/* QR SCANNER MODAL */}

      {showScanner && (
        <div
          className="qr-modal-overlay"
          onClick={stopQRScanner}
        >
          <div
            className="qr-modal scanner-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="qr-close"
              onClick={stopQRScanner}
              aria-label="Close QR scanner"
            >
              <X size={20} />
            </button>

            <div className="scanner-header">
              <div className="scanner-icon">
                <QrCode size={24} />
              </div>

              <div>
                <h2>Scan QR Code</h2>
                <p>Scan a UPI QR to pay securely</p>
              </div>
            </div>

            <div id="qr-reader" className="qr-reader" />

            <div className="scanner-instruction">
              <QrCode size={19} />
              <span>
                Place the QR code inside the scanning frame.
              </span>
            </div>

            {scannerMessage && (
              <div className="payment-message scanner-message">
                <CheckCircle size={18} />
                <span>{scannerMessage}</span>
              </div>
            )}

            <button
              type="button"
              className="scanner-cancel-button"
              onClick={stopQRScanner}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
}



