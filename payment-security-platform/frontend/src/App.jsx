import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PhonePeDashboard from './PhonePeDashboard';
import APIExplorer from './pages/APIExplorer';
import SecurityScan from './pages/SecurityScan';
import Vulnerabilities from './pages/Vulnerabilities';
import Reports from './pages/Reports';
import SecurityIncidents from './pages/SecurityIncidents';

function ProtectedSecurityRoute({ children }) {
  try {
    const rawUser = localStorage.getItem('paymentUser');
    if (rawUser) {
      const user = JSON.parse(rawUser);
      if (['ADMIN', 'SECURITY_REVIEWER'].includes(user?.role)) {
        return children;
      }
    }
  } catch (err) {
    console.warn('Error reading user role from localStorage:', err);
  }
  return <Navigate to="/dashboard" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Login / Mode Selection */}
        <Route path="/" element={<Login />} />

        {/* User Mode */}
        <Route
          path="/payment"
          element={<PhonePeDashboard />}
        />

        {/* Security Mode */}
        <Route
          path="/dashboard"
          element={
            <Layout>
              <Dashboard />
            </Layout>
          }
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

        {/* Security Tools */}
        <Route
          path="/api-explorer"
          element={
            <Layout>
              <APIExplorer />
            </Layout>
          }
        />

        <Route
          path="/security-scan"
          element={
            <Layout>
              <SecurityScan />
            </Layout>
          }
        />

        <Route
          path="/vulnerabilities"
          element={
            <Layout>
              <Vulnerabilities />
            </Layout>
          }
        />

        <Route
          path="/reports"
          element={
            <Layout>
              <Reports />
            </Layout>
          }
        />

        {/* Unknown URL */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
