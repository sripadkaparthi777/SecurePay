import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, User, Mail, Phone, Lock, ArrowRight } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
  });

  const [mode, setMode] = useState('user');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.name || !form.phone || !form.email) {
      setError('Please fill in all the details.');
      return;
    }

    if (form.phone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    // Store mock user information for the frontend
    localStorage.setItem(
      'paymentUser',
      JSON.stringify({
        name: form.name,
        phone: form.phone,
        email: form.email,
        mode: mode,
      })
    );

    if (mode === 'user') {
      navigate('/payment');
    } else {
      navigate('/dashboard');
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
            Secure Payment & API Security Platform
          </p>
        </div>

        <div className="security-badge">
          <Lock size={15} />
          <span>Secure Login</span>
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
            <label>Email Address</label>

            <div className="input-wrapper">
              <Mail size={18} />

              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={form.email}
                onChange={handleChange}
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
                  <span>Make payments & manage account</span>
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
                  <span>Analyze payment & security tests</span>
                </div>
              </button>

            </div>
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button type="submit" className="login-button">
            Continue as{' '}
            {mode === 'user' ? 'User' : 'Security Analyst'}

            <ArrowRight size={19} />
          </button>

        </form>

        <div className="login-footer">
          <ShieldCheck size={15} />
          <span>Your payment data is protected</span>
        </div>

      </div>
    </div>
  );
}