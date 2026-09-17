import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PhonePeDashboard from './PhonePeDashboard';
import APIExplorer from './pages/APIExplorer';
import SecurityScan from './pages/SecurityScan';
import SecurityIncidents from './pages/SecurityIncidents';

function getCurrentUser() {
  try {
    const rawUser = localStorage.getItem('paymentUser');

    if (rawUser) {
      return JSON.parse(rawUser);
    }
  } catch (err) {
    console.warn('Error reading user from localStorage:', err);
  }

  return null;
}

function ProtectedSecurityRoute({ children }) {
  const user = getCurrentUser();

  if (['ADMIN', 'SECURITY_REVIEWER'].includes(user?.role)) {
    return children;
  }

  return <Navigate to="/dashboard" replace />;
}

function MainDashboard() {
  const user = getCurrentUser();

  const isSecurityUser = ['ADMIN', 'SECURITY_REVIEWER'].includes(
    user?.role
  );

  // Security users get the security-management dashboard.
  // Normal users get the unified payment + security dashboard.
  if (isSecurityUser) {
    return (
      <Layout>
        <Dashboard />
      </Layout>
    );
  }

  return <PhonePeDashboard />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Login */}
        <Route
          path="/"
          element={<Login />}
        />

        {/* Unified Dashboard */}
        <Route
          path="/dashboard"
          element={<MainDashboard />}
        />

        {/* Old payment URL redirects to unified dashboard */}
        <Route
          path="/payment"
          element={<Navigate to="/dashboard" replace />}
        />

        {/* Security Incidents */}
        <Route
          path="/security-incidents"
          element={
            <ProtectedSecurityRoute>
              <Layout>
                <SecurityIncidents />
              </Layout>
            </ProtectedSecurityRoute>
          }
        />

        {/* API Explorer */}
        <Route
          path="/api-explorer"
          element={
            <Layout>
              <APIExplorer />
            </Layout>
          }
        />

        {/* Security Scan */}
        <Route
          path="/security-scan"
          element={
            <Layout>
              <SecurityScan />
            </Layout>
          }
        />

        {/* Unknown URL */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;