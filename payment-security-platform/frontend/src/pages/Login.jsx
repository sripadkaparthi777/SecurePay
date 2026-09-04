import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, User, Mail, Phone, Lock, ArrowRight, KeyRound } from 'lucide-react';
import { api } from '../services/api';

const DEMO_PERSONAS = [
  {
    label: 'User A',
    subtitle: 'userA@upi',
    name: 'User A',
    email: 'userA@securepay.local',
    phone: '9876543210',
    password: 'UserA@123',
    mode: 'user',
  },
  {
    label: 'User B',
    subtitle: 'userB@upi',
    name: 'User B',
    email: 'userB@securepay.local',
    phone: '9876543211',
    password: 'UserB@123',
    mode: 'user',
  },
  {
    label: 'Admin',
    subtitle: 'admin@upi',
    name: 'System Admin',
    email: 'admin@securepay.local',
    phone: '9876543200',
    password: 'Admin@123',
    mode: 'security',
  },
  {
    label: 'Reviewer',
    subtitle: 'reviewer@upi',
    name: 'Security Reviewer',
    email: 'reviewer@securepay.local',
    phone: '9876543201',
    password: 'Reviewer@123',
    mode: 'security',
  },
];

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: 'User A',
    phone: '9876543210',
    email: 'userA@securepay.local',
    password: 'UserA@123',
  });

  const [mode, setMode] = useState('user');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const selectPersona = (p) => {
    setForm({
      name: p.name,
      phone: p.phone,
      email: p.email,
      password: p.password,
    });
    setMode(p.mode);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.email || !form.password) {
      setError('Please provide your email/UPI ID and password.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const loginRes = await api.login(form.email, form.password);

      if (loginRes && loginRes.success) {
        // Store display user profile for frontend UI
        localStorage.setItem(
          'paymentUser',
          JSON.stringify({
            id: loginRes.user.id,
            name: loginRes.user.name || form.name,
            phone: form.phone,
            email: loginRes.user.email,
            upiId: loginRes.user.upiId,
            role: loginRes.user.role,
            mode: mode,
          })
        );

        if (mode === 'user') {
          navigate('/payment');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(loginRes.error || 'Authentication failed.');
      }
    } catch (err) {
      console.error('Login error:', err);
      const errMsg =
        err.response?.data?.error ||
        'Unable to connect to backend. Please ensure the backend server is running on port 5002.';
      setError(errMsg);
    } finally {
      setIsLoading(false);
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

        {/* Demo Persona Quick-Select */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
            Quick Demo Personas:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {DEMO_PERSONAS.map((p) => (
              <button
                key={p.email}
                type="button"
                onClick={() => selectPersona(p)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: form.email === p.email ? '1px solid #7c3aed' : '1px solid rgba(255,255,255,0.1)',
                  background: form.email === p.email ? 'rgba(124, 58, 237, 0.2)' : 'rgba(255,255,255,0.03)',
                  color: '#f8fafc',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '12px',
                  transition: 'all 0.2s',
                }}
              >
                <strong style={{ display: 'block', color: form.email === p.email ? '#c084fc' : '#e2e8f0' }}>
                  {p.label}
                </strong>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>{p.subtitle}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>

          <div className="login-field">
            <label>Full Name</label>

            <div className="input-wrapper">
              <User size={18} />

              <input
                type="text"
                name="name"
                placeholder="Enter your name"
                value={form.name}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="login-field">
            <label>Mobile Number</label>

            <div className="input-wrapper">
              <Phone size={18} />

              <input
                type="tel"
                name="phone"
                placeholder="10-digit mobile number"
                maxLength="10"
                value={form.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="login-field">
            <label>Email / UPI ID</label>

            <div className="input-wrapper">
              <Mail size={18} />

              <input
                type="text"
                name="email"
                placeholder="Enter email or UPI ID"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="login-field">
            <label>Password</label>

            <div className="input-wrapper">
              <KeyRound size={18} />

              <input
                type="password"
                name="password"
                placeholder="Enter password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="mode-section">
            <label>Select Application Mode</label>

            <div className="mode-options">

              <button
                type="button"
                className={`mode-option ${
                  mode === 'user' ? 'active' : ''
                }`}
                onClick={() => setMode('user')}
              >
                <User size={22} />

                <div>
                  <strong>User Mode</strong>
                  <span>Make payments &amp; manage account</span>
                </div>
              </button>

              <button
                type="button"
                className={`mode-option ${
                  mode === 'security' ? 'active' : ''
                }`}
                onClick={() => setMode('security')}
              >
                <ShieldCheck size={22} />

                <div>
                  <strong>Security Mode</strong>
                  <span>Analyze payment &amp; security tests</span>
                </div>
              </button>

            </div>
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? 'Authenticating...' : `Continue as ${mode === 'user' ? 'User' : 'Security Analyst'}`}
            <ArrowRight size={19} />
          </button>

        </form>

        <div className="login-footer">
          <ShieldCheck size={15} />
          <span>Protected by Server-Side JWT Security</span>
        </div>

      </div>
    </div>
  );
}