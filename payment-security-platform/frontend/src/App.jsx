import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ModeSelection from './pages/ModeSelection';
import Dashboard from './pages/Dashboard';
import PhonePeDashboard from './PhonePeDashboard';
import APIExplorer from './pages/APIExplorer';
import SecurityScan from './pages/SecurityScan';
import SecurityIncidents from './pages/SecurityIncidents';
import AttackSimulation from './pages/AttackSimulation';

function getCurrentUser() {
  try {
    const rawUser =
      localStorage.getItem('paymentUser');

    if (rawUser) {
      return JSON.parse(rawUser);
    }
  } catch (err) {
    console.warn(
      'Error reading user from localStorage:',
      err
    );
  }

  return null;
}

function hasSession() {
  return !!(
    localStorage.getItem(
      'securepay_token'
    ) &&
    getCurrentUser()
  );
}

function ProtectedSecurityRoute({
  children,
}) {
  const user = getCurrentUser();

  if (!hasSession()) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  if (
    ['ADMIN', 'SECURITY_REVIEWER'].includes(
      user?.role
    )
  ) {
    return children;
  }

  return (
    <Navigate
      to="/dashboard"
      replace
    />
  );
}

function MainDashboard() {
  const user = getCurrentUser();

  if (!hasSession()) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  const isSecurityUser =
    ['ADMIN', 'SECURITY_REVIEWER'].includes(
      user?.role
    );

  const selectedMode =
    localStorage.getItem(
      'securepay_workspace_mode'
    ) ||
    user?.mode ||
    'USER';

  if (
    isSecurityUser &&
    selectedMode === 'SECURITY'
  ) {
    return (
      <Layout>
        <Dashboard />
      </Layout>
    );
  }

  return (
    <PhonePeDashboard
      initialWorkspaceMode={
        selectedMode === 'SECURITY'
          ? 'SECURITY'
          : 'USER'
      }
    />
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/mode"
          element={<ModeSelection />}
        />

        <Route
          path="/dashboard"
          element={<MainDashboard />}
        />

        <Route
          path="/payment"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />

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
          path="/attack-simulation"
          element={
            <Layout>
              <AttackSimulation />
            </Layout>
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
