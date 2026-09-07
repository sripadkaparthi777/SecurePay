import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from './services/api';
import './PhonePeDashboard.css';
import { formatINR } from './utils/formatCurrency';

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
  LogOut,
  UserCheck,
} from 'lucide-react';

export default function PhonePeDashboard() {
  const navigate = useNavigate();

  // USER IDENTITY & SERVER STATE
  let savedUser = {};
  try {
    savedUser = JSON.parse(localStorage.getItem('paymentUser')) || {};
  } catch {
    savedUser = {};
  }

  const [currentUser, setCurrentUser] = useState(savedUser);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Add Money Modal State
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [addMoneyAmount, setAddMoneyAmount] = useState('1000');
  const [addMoneyMessage, setAddMoneyMessage] = useState('');
  const [isAddingMoney, setIsAddingMoney] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const [paymentResult, setPaymentResult] = useState(null);

  const user = {
    name: currentUser.name || savedUser.name || 'User',
    mobile: currentUser.phone || savedUser.phone
      ? `${String(currentUser.phone || savedUser.phone).slice(0, 2)}******${String(currentUser.phone || savedUser.phone).slice(-2)}`
      : 'Not available',
    email: currentUser.email || savedUser.email || 'Not available',
  };

  const myUpiId = currentUser.upiId || savedUser.upiId || 'userA@upi';

  const [activeTab, setActiveTab] = useState('home');
  const [paymentMode, setPaymentMode] = useState('TO_MOBILE'); // 'TO_MOBILE' | 'TO_SELF'
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

  // Load authoritative data from backend server
  const loadServerData = async () => {
    setIsLoadingData(true);
    try {
      // Fetch authenticated user profile
      const meRes = await api.getMe();
      if (meRes?.user) {
        setCurrentUser(meRes.user);
      }

      // Fetch server-side balance
      const accRes = await api.getMyAccount();
      if (accRes?.account) {
        setBalance(accRes.account.balance);
      }

      // Fetch server-side transaction history
      const txRes = await api.getMyTransactions();
      if (txRes?.transactions) {
        setTransactions(txRes.transactions);
      }
    } catch (err) {
      console.warn('Backend connection error or unauthorized:', err);
      // If unauthorized, redirect to login
      if (err.response?.status === 401) {
        navigate('/');
      }
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadServerData();
  }, []);

  // AI Security Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysisError, setAiAnalysisError] = useState(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);

  const bank = {
    name: 'State Bank of India',
    account: 'XXXX 4582',
  };

  const securityScore = aiAnalysisResult?.securityScore ?? 82;

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
      const data = await api.analyzeSecurity(tx, apiResponsePayload);

      if (data && data.success && data.analysis) {
        setAiAnalysisResult(data.analysis);
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

            setPaymentMode('TO_MOBILE');
            setForm((prev) => ({
              ...prev,
              receiver: details.upiId,
            }));

            setScannerMessage(
              `QR scanned successfully. ${details.name} | ${details.upiId}`
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

  const openPayFlow = (mode) => {
    setPaymentMode(mode);
    setMessage('');
    if (mode === 'TO_SELF') {
      setForm((prev) => ({ ...prev, receiver: myUpiId }));
    } else {
      setForm((prev) => ({ ...prev, receiver: '' }));
    }
    setActiveTab('pay');
  };

  // =============================
  // PAYMENT
  // =============================

  const handlePayment = async (e) => {
    e.preventDefault();
    setMessage('');

    const receiverUpi = paymentMode === 'TO_SELF' ? myUpiId : form.receiver.trim();

    if (!receiverUpi) {
      setMessage('Please enter a UPI ID.');
      return;
    }

    if (!isValidUpi(receiverUpi)) {
      setMessage('Invalid UPI ID. Example: userB@upi');
      return;
    }

    if (!form.amount) {
      setMessage('Please enter an amount.');
      return;
    }

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage('Amount must be greater than Γé╣0.');
      return;
    }

    setIsSubmittingPayment(true);

    try {
      const idempotencyKey = `idemp-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const res = await api.sendPayment({
        receiverUpi,
        amount,
        idempotencyKey,
        note: paymentMode === 'TO_SELF' ? 'Self Transfer' : undefined,
      });

      if (res && res.success) {
        setBalance(res.balance);
        setForm({ receiver: paymentMode === 'TO_SELF' ? myUpiId : '', amount: '' });
        setMessage('');

        setPaymentResult({
          type: 'success',
          amount,
          receiver: receiverUpi,
          transactionId:
            res.transaction?.transactionId ||
            res.transaction?.id ||
            'N/A',
        });

        if (navigator.vibrate) {
          navigator.vibrate([120, 60, 120]);
        }

        const txRes = await api.getMyTransactions();

        if (txRes?.transactions) {
          setTransactions(txRes.transactions);
        }

        await analyzeTransactionSecurity(
          res.transaction,
          {
            statusCode: 200,
            statusMessage: 'Payment Processed Successfully',
            timestamp: new Date().toISOString(),
          }
        );
      }
    } catch (err) {
      console.error('Payment error:', err);

      const errMsg =
        err.response?.data?.error ||
        'Payment processing failed.';

      setMessage('');

      setPaymentResult({
        type: 'error',
        amount,
        receiver: receiverUpi,
        transactionId: null,
        error: errMsg,
      });

      if (navigator.vibrate) {
        navigator.vibrate([200, 80, 200]);
      }
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleAddMoney = async (e) => {
    e?.preventDefault();
    setAddMoneyMessage('');
    const amt = Number(addMoneyAmount);

    if (!amt || !Number.isFinite(amt) || amt <= 0) {
      setAddMoneyMessage('Please enter a valid amount greater than Γé╣0.');
      return;
    }

    setIsAddingMoney(true);
    try {
      const res = await api.addMoney(amt);
      if (res && res.success) {
        setBalance(res.balance);
        setAddMoneyMessage(`Γé╣${amt.toFixed(2)} added successfully!`);
        setTimeout(() => {
          setShowAddMoneyModal(false);
          setAddMoneyMessage('');
        }, 1200);
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to add money.';
      setAddMoneyMessage(errMsg);
    } finally {
      setIsAddingMoney(false);
    }
  };

  // =============================
  // STATUS ICON & STYLING
  // =============================

  const statusIcon = (status) => {
    const s = String(status || '').toUpperCase();
    if (s === 'COMPLETED' || s === 'SUCCESS') {
      return <CheckCircle size={18} />;
    }
    if (s === 'PENDING') {
      return <Clock size={18} />;
    }
    return <XCircle size={18} />;
  };

  const statusClass = (status) => {
    const s = String(status || '').toUpperCase();
    if (s === 'COMPLETED' || s === 'SUCCESS') {
      return 'payment-status completed';
    }
    if (s === 'PENDING') {
      return 'payment-status pending';
    }
    return 'payment-status failed';
  };

  const getReceiverLabel = (tx) => {
    if (tx.receiverName && tx.receiverUpi) {
      return `To: ${tx.receiverName} (${tx.receiverUpi})`;
    }
    if (tx.receiverUpi) {
      return `To: ${tx.receiverUpi}`;
    }
    if (tx.receiver) {
      return `To: ${tx.receiver}`;
    }
    if (tx.receiver_upi) {
      return `To: ${tx.receiver_upi}`;
    }
    return 'To: N/A';
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
            onClick={() => openPayFlow('TO_MOBILE')}
            className="quick-action"
          >
            <div className="quick-icon">
              <Smartphone size={21} />
            </div>
            <span>To Mobile</span>
          </button>

          <button
            type="button"
            onClick={() => openPayFlow('TO_MOBILE')}
            className="quick-action"
          >
            <div className="quick-icon">
              <Building size={21} />
            </div>
            <span>To Bank / UPI</span>
          </button>

          <button
            type="button"
            onClick={() => openPayFlow('TO_SELF')}
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

        <button type="button" onClick={() => setShowAddMoneyModal(true)}>
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
                key={tx.id || tx.transactionId}
              >
                <div className="recent-avatar">
                  <Send size={17} />
                </div>

                <div className="recent-info">
                  <strong>{getReceiverLabel(tx)}</strong>
                  <span>{tx.date || (tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : 'N/A')}</span>
                </div>

                <div className="recent-amount">
                  <strong style={{ color: tx.type === 'RECEIVED' ? '#16a34a' : 'inherit' }}>
                    {tx.type === 'RECEIVED' ? '+' : '-'}{formatINR(tx.amount)}
                  </strong>

                  <span className={statusClass(tx.status)}>
                    {statusIcon(tx.status)}
                    {String(tx.status || 'COMPLETED').toUpperCase()}
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
          <h2>{paymentMode === 'TO_SELF' ? 'Self Transfer' : 'Send Money'}</h2>
          <p>
            {paymentMode === 'TO_SELF'
              ? 'Transfer funds to your own linked account / UPI ID'
              : 'Make a secure mock payment to mobile or UPI'}
          </p>
        </div>

        <div className="secure-badge">
          <Lock size={14} />
          Secure
        </div>
      </div>

      <div className="transfer-mode-selector">
        <button
          type="button"
          className={`mode-tab ${paymentMode === 'TO_MOBILE' ? 'active' : ''}`}
          onClick={() => openPayFlow('TO_MOBILE')}
        >
          <Smartphone size={16} /> To Mobile / UPI
        </button>
        <button
          type="button"
          className={`mode-tab ${paymentMode === 'TO_SELF' ? 'active' : ''}`}
          onClick={() => openPayFlow('TO_SELF')}
        >
          <UserCheck size={16} /> To Self Account
        </button>
      </div>

      <form
        onSubmit={handlePayment}
        className="payment-form"
      >
        <label>
          {paymentMode === 'TO_SELF' ? 'Destination Account (Your UPI)' : 'Receiver UPI ID'}

          <div className="upi-input-row">
            <input
              type="text"
              placeholder={paymentMode === 'TO_SELF' ? myUpiId : 'e.g. rahul@upi'}
              value={paymentMode === 'TO_SELF' ? myUpiId : form.receiver}
              disabled={paymentMode === 'TO_SELF'}
              onChange={(e) =>
                setForm({
                  ...form,
                  receiver: e.target.value,
                })
              }
            />

            {paymentMode !== 'TO_SELF' && (
              <button
                type="button"
                className="scan-qr-button"
                onClick={startQRScanner}
              >
                <QrCode size={18} />
                Scan QR
              </button>
            )}
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
            Γé╣{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </strong>
        </div>

        <button
          className="send-payment-button"
          type="submit"
          disabled={isAnalyzing || isSubmittingPayment}
        >
          <Send size={19} />
          {isSubmittingPayment ? 'Processing...' : isAnalyzing ? 'Analyzing...' : paymentMode === 'TO_SELF' ? 'Transfer to Self' : 'Pay Securely'}
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
            key={tx.id || tx.transactionId}
          >
            <div className="history-left">
              <div className="history-icon">
                <Send size={18} />
              </div>

              <div>
                <strong>{getReceiverLabel(tx)}</strong>
                <span>ID: {tx.id || tx.transactionId}</span>
                <small>{tx.date || (tx.createdAt ? new Date(tx.createdAt).toLocaleString() : 'N/A')}</small>
              </div>
            </div>

            <div className="history-right">
              <strong style={{ color: tx.type === 'RECEIVED' ? '#16a34a' : 'inherit' }}>
                {tx.type === 'RECEIVED' ? '+' : '-'}{formatINR(tx.amount)}
              </strong>

              <span className={statusClass(tx.status)}>
                {statusIcon(tx.status)}
                {String(tx.status || 'COMPLETED').toUpperCase()}
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
            Primary Account | {bank.account}
          </span>
        </div>

        <div className="bank-balance">
          <small>Available</small>

          <strong>
            Γé╣{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
            Server-Side Shared Ledger
          </strong>

          <p>
            Current Account: <strong>{myUpiId}</strong>
          </p>
          <p>
            Server Balance: <strong>Γé╣{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
          </p>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            Persisted in server-side SQLite database. Shared across all browsers and users.
          </p>
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
              key={tx.id || tx.transactionId}
            >
              <div className="security-transaction-top">
                <div>
                  <strong>
                    {getReceiverLabel(tx)}
                  </strong>

                  <span>ID: {tx.id || tx.transactionId}</span>
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
                    ? 'Security Passed'
                    : 'Security Warning'}
                </span>

                <p>{security.issue}</p>
              </div>

              <div className="security-tests-mini">
                <span>
                  Authentication
                </span>

                <span>
                  Authorization
                </span>

                <span>
                  Amount Validation
                </span>

                <span>
                  {security.result ===
                  'Passed'
                    ? 'Replay Protection'
                    : 'Replay Detection'}
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

          <button
            type="button"
            onClick={() => {
              api.logout();
              navigate('/');
            }}
            title="Switch Account / Logout"
          >
            <LogOut size={21} />
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
                ? `Γé╣${balance.toLocaleString(
                    'en-IN',
                    {
                      minimumFractionDigits: 2,
                    }
                  )}`
                : 'ΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇó'}
            </div>

            <p className="balance-account">
              {bank.name} | {bank.account}
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
            openPayFlow('TO_MOBILE')
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

      {/* ADD MONEY MODAL */}

      {showAddMoneyModal && (
        <div
          className="qr-modal-overlay"
          onClick={() => setShowAddMoneyModal(false)}
        >
          <div
            className="qr-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '380px' }}
          >
            <button
              type="button"
              className="qr-close"
              onClick={() => setShowAddMoneyModal(false)}
            >
              <X size={20} />
            </button>

            <h2>Add Money</h2>
            <p>Simulated deposit to your server balance</p>

            <form
              onSubmit={handleAddMoney}
              style={{
                marginTop: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  justifyContent: 'center',
                }}
              >
                {['500', '1000', '2000', '5000'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAddMoneyAmount(val)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border:
                        addMoneyAmount === val
                          ? '2px solid #5f259f'
                          : '1px solid #e2e8f0',
                      background:
                        addMoneyAmount === val ? '#f3e8ff' : '#f8fafc',
                      color: '#1e293b',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Γé╣{val}
                  </button>
                ))}
              </div>

              <div className="amount-input" style={{ margin: '8px 0' }}>
                <IndianRupee size={20} />
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={addMoneyAmount}
                  onChange={(e) => setAddMoneyAmount(e.target.value)}
                  placeholder="Enter amount"
                  required
                />
              </div>

              {addMoneyMessage && (
                <div
                  style={{
                    fontSize: '13px',
                    color: addMoneyMessage.includes('added')
                      ? '#16a34a'
                      : '#dc2626',
                    textAlign: 'center',
                  }}
                >
                  {addMoneyMessage}
                </div>
              )}

              <button
                type="submit"
                className="send-payment-button"
                disabled={isAddingMoney}
              >
                {isAddingMoney
                  ? 'Adding Funds...'
                  : `Add Γé╣${Number(addMoneyAmount || 0)}`}
              </button>
            </form>
          </div>
        </div>
      )}
      {paymentResult && (
        <div
          className={`payment-result-overlay ${
            paymentResult.type === 'success'
              ? 'payment-success'
              : 'payment-failure'
          }`}
        >
          <div className="payment-result-card">

            <div className="payment-result-icon">
              {paymentResult.type === 'success'
                ? 'Γ£ô'
                : 'Γ£ò'}
            </div>

            <h1>
              {paymentResult.type === 'success'
                ? 'Payment Successful'
                : 'Payment Failed'}
            </h1>

            <div className="payment-result-amount">
              {new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }).format(
                Number(paymentResult.amount || 0)
              )}
            </div>

            {paymentResult.type === 'success' ? (
              <>
                <p>
                  Sent to {paymentResult.receiver}
                </p>

                <small>
                  Transaction ID:{' '}
                  {paymentResult.transactionId}
                </small>
              </>
            ) : (
              <p>
                {paymentResult.error}
              </p>
            )}

            <button
              type="button"
              onClick={() => setPaymentResult(null)}
            >
              Continue
            </button>

          </div>
        </div>
      )}

    </div>
  );
}