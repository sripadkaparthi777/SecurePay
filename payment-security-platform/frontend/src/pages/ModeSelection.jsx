import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  User,
  Shield,
  ArrowRight,
  LogOut,
} from 'lucide-react';
import { api } from '../services/api';

export default function ModeSelection() {
  const navigate = useNavigate();

  let user = null;

  try {
    user = JSON.parse(localStorage.getItem('paymentUser')) || null;
  } catch {
    user = null;
  }

  const token = localStorage.getItem('securepay_token');

  if (!user || !token) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <ShieldCheck size={34} />
            </div>
            <h1>Session Required</h1>
            <p>Please log in to continue.</p>
          </div>

          <button
            type="button"
            className="login-button"
            onClick={() => navigate('/')}
          >
            Go to Login
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  const isPrivileged = ['ADMIN', 'SECURITY_REVIEWER'].includes(user.role);

  const chooseMode = (mode) => {
    localStorage.setItem('securepay_workspace_mode', mode);

    localStorage.setItem(
      'paymentUser',
      JSON.stringify({
        ...user,
        mode,
      })
    );

    navigate('/dashboard', { replace: true });
  };

  const logout = () => {
    api.logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="login-page">
      <div
        className="login-card"
        style={{ maxWidth: '760px' }}
      >
        <div className="login-header">
          <div className="login-logo">
            <ShieldCheck size={34} />
          </div>

          <h1>Choose Your Workspace</h1>

          <p>
            Welcome, {user.name || 'User'}.
            Select how you want to use SecurePay.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '14px',
            marginTop: '24px',
          }}
        >

          <button
            type="button"
            onClick={() => chooseMode('USER')}
            disabled={isPrivileged}
            style={{
              textAlign: 'left',
              padding: '20px',
              borderRadius: '14px',
              border: '1px solid rgba(59,130,246,0.3)',
              background: isPrivileged
                ? 'rgba(255,255,255,0.025)'
                : 'rgba(59,130,246,0.08)',
              color: '#e2e8f0',
              cursor: isPrivileged ? 'not-allowed' : 'pointer',
              opacity: isPrivileged ? 0.5 : 1,
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                display: 'grid',
                placeItems: 'center',
                background: 'rgba(59,130,246,0.16)',
                marginBottom: '12px',
              }}
            >
              <User size={23} />
            </div>

            <strong
              style={{
                display: 'block',
                fontSize: '18px',
                marginBottom: '6px',
              }}
            >
              User Mode
            </strong>

            <span
              style={{
                display: 'block',
                color: '#94a3b8',
                fontSize: '13px',
                lineHeight: 1.5,
              }}
            >
              Make payments, manage balance, view transactions
              and use your SecurePay account.
            </span>

            {isPrivileged && (
              <small
                style={{
                  display: 'block',
                  marginTop: '12px',
                  color: '#fbbf24',
                }}
              >
                Available for payment-user accounts.
              </small>
            )}
          </button>

          <button
            type="button"
            onClick={() => chooseMode('SECURITY')}
            style={{
              textAlign: 'left',
              padding: '20px',
              borderRadius: '14px',
              border: '1px solid rgba(124,58,237,0.4)',
              background: 'rgba(124,58,237,0.1)',
              color: '#e2e8f0',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                display: 'grid',
                placeItems: 'center',
                background: 'rgba(124,58,237,0.18)',
                marginBottom: '12px',
              }}
            >
              <Shield size={23} />
            </div>

            <strong
              style={{
                display: 'block',
                fontSize: '18px',
                marginBottom: '6px',
              }}
            >
              Security Mode
            </strong>

            <span
              style={{
                display: 'block',
                color: '#94a3b8',
                fontSize: '13px',
                lineHeight: 1.5,
              }}
            >
              Security monitoring, API security testing,
              OWASP checks, scans and security analysis.
            </span>
          </button>

        </div>

        <button
          type="button"
          onClick={logout}
          style={{
            width: '100%',
            marginTop: '20px',
            padding: '11px 16px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.03)',
            color: '#cbd5e1',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <LogOut size={17} />
          Use another account
        </button>

        <div className="login-footer">
          <ShieldCheck size={15} />
          <span>Your selected workspace is saved for this session</span>
        </div>
      </div>
    </div>
  );
}
