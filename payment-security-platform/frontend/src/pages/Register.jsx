import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  User,
  Phone,
  Mail,
  Lock,
  ArrowLeft,
  UserPlus,
} from 'lucide-react';
import { api } from '../services/api';

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.name.trim() ||
      !form.phone.trim() ||
      !form.email.trim() ||
      !form.password ||
      !form.confirmPassword
    ) {
      setError('Please fill in all fields.');
      return;
    }

    if (!/^\d{10}$/.test(form.phone.trim())) {
      setError('Mobile number must contain exactly 10 digits.');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.register({
        name: form.name,
        phone: form.phone,
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });

      if (res?.success) {
        setSuccess(
          `Account created successfully. Your UPI ID is ${res.user.upiId}.`
        );
        setForm({
          name: '',
          phone: '',
          email: '',
          password: '',
          confirmPassword: '',
        });
      } else {
        setError(res?.error || 'Unable to create account.');
      }
    } catch (err) {
      console.error('Registration error:', err);

      setError(
        err.response?.data?.error ||
        'Unable to connect to backend. Please ensure port 5002 is running.'
      );
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

          <h1>Create Account</h1>

          <p>
            Join SecurePay as a payment user
          </p>
        </div>

        <form onSubmit={handleSubmit}>

          <div className="login-field">
            <label>Full Name</label>
            <div className="input-wrapper">
              <User size={18} />
              <input
                type="text"
                name="name"
                placeholder="Enter your full name"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
                required
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
                value={form.phone}
                onChange={handleChange}
                maxLength="10"
                inputMode="numeric"
                autoComplete="tel"
                required
              />
            </div>
          </div>

          <div className="login-field">
            <label>Email</label>
            <div className="input-wrapper">
              <Mail size={18} />
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
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
                placeholder="Minimum 8 characters"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          <div className="login-field">
            <label>Confirm Password</label>
            <div className="input-wrapper">
              <Lock size={18} />
              <input
                type="password"
                name="confirmPassword"
                placeholder="Re-enter your password"
                value={form.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                marginTop: '10px',
                padding: '11px 12px',
                borderRadius: '9px',
                background: 'rgba(34,197,94,0.12)',
                border: '1px solid rgba(34,197,94,0.35)',
                color: '#bbf7d0',
                fontSize: '13px',
                lineHeight: 1.5,
              }}
            >
              {success}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={isLoading}
          >
            <UserPlus size={18} />
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>

        </form>

        <button
          type="button"
          onClick={() => navigate('/')}
          style={{
            width: '100%',
            marginTop: '10px',
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
          <ArrowLeft size={17} />
          Back to Login
        </button>

        <div className="login-footer">
          <ShieldCheck size={15} />
          <span>New accounts receive the USER role</span>
        </div>

      </div>
    </div>
  );
}
