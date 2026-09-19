import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Mail,
  Lock,
  ArrowRight,
  UserPlus,
  User,
  Shield,
} from 'lucide-react';
import { api } from '../services/api';

const DEMO_ACCOUNTS = [
  {
    label: 'User A',
    identifier: 'userA@securepay.local',
    password: 'UserA@123',
  },
  {
    label: 'User B',
    identifier: 'userB@securepay.local',
    password: 'UserB@123',
  },
  {
    label: 'Admin',
    identifier: 'admin@securepay.local',
    password: 'Admin@123',
  },
  {
    label: 'Reviewer',
    identifier: 'reviewer@securepay.local',
    password: 'Reviewer@123',
  },
];

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    identifier: '',
    password: '',
  });

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState('');

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setError('');
  };

  const completeLogin = (loginRes) => {
    if (!loginRes?.success || !loginRes?.user) {
      setError(loginRes?.error || 'Authentication failed.');
      return false;
    }

    const user = loginRes.user;

    localStorage.setItem(
      'paymentUser',
      JSON.stringify({
        id: user.id,
        name: user.name || 'User',
        phone: user.phone || '',
        email: user.email || '',
        upiId: user.upiId || '',
        role: user.role || 'USER',
        mode: null,
      })
    );

    localStorage.removeItem('securepay_workspace_mode');

    navigate('/mode');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const identifier = form.identifier.trim();

    if (!identifier || !form.password) {
      setError('Please enter your email/UPI ID and password.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const loginRes = await api.login(identifier, form.password);
      completeLogin(loginRes);
    } catch (err) {
      console.error('Login error:', err);

      const errMsg =
        err.response?.data?.error ||
        'Unable to connect to backend. Please ensure port 5002 is running.';

      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (demo) => {
    setDemoLoading(demo.label);
    setError('');

    try {
      const loginRes = await api.login(
        demo.identifier,
        demo.password
      );

      completeLogin(loginRes);
    } catch (err) {
      console.error('Demo login error:', err);

      setError(
        err.response?.data?.error ||
        `Unable to login as ${demo.label}.`
      );
    } finally {
      setDemoLoading('');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-header">
          <div className="login-logo">
            <ShieldCheck size={34} />
          </div>

          <h1>SecurePay</h1>

          <p>
            Secure Payment &amp; API Security Platform
          </p>
        </div>

        <div className="security-badge">
          <Lock size={15} />
          <span>Server-Authenticated Login (JWT)</span>
        </div>

        <form onSubmit={handleSubmit}>

          <div className="login-field">
            <label>Email / UPI ID</label>

            <div className="input-wrapper">
              <Mail size={18} />

              <input
                type="text"
                name="identifier"
                placeholder="Enter email or UPI ID"
                value={form.identifier}
                onChange={handleChange}
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="login-field">
            <label>Password</label>

            <div className="input-wrapper">
              <Lock size={18} />

              <input
                type="password"
                name="password"
                placeholder="Enter password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={isLoading || !!demoLoading}
          >
            {isLoading ? 'Authenticating...' : 'Login'}
            <ArrowRight size={19} />
          </button>

        </form>

        <button
          type="button"
          onClick={() => navigate('/register')}
          disabled={isLoading || !!demoLoading}
          style={{
            width: '100%',
            marginTop: '12px',
            padding: '12px 16px',
            borderRadius: '10px',
            border: '1px solid rgba(124,58,237,0.45)',
            background: 'rgba(124,58,237,0.12)',
            color: '#e9d5ff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontWeight: 600,
          }}
        >
          <UserPlus size={18} />
          Create Account
        </button>

        <div
          style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              color: '#94a3b8',
              marginBottom: '9px',
              textAlign: 'center',
            }}
          >
            Demo Accounts
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px',
            }}
          >
            {DEMO_ACCOUNTS.map((demo) => (
              <button
                key={demo.label}
                type="button"
                onClick={() => handleDemoLogin(demo)}
                disabled={isLoading || !!demoLoading}
                style={{
                  padding: '9px 10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.03)',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '12px',
                }}
              >
                {demo.label === 'Admin' || demo.label === 'Reviewer'
                  ? <Shield size={14} />
                  : <User size={14} />}

                {demoLoading === demo.label
                  ? 'Logging in...'
                  : demo.label}
              </button>
            ))}
          </div>
        </div>

        <div className="login-footer">
          <ShieldCheck size={15} />
          <span>Protected by Server-Side JWT Security</span>
        </div>

      </div>
    </div>
  );
}
