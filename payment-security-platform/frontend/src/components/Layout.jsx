import React from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

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

function Layout({ children }) {
  const user = getCurrentUser();

  return (
    <div className="app-layout">
      <Sidebar user={user} />
      <div className="main-wrapper">
        <Navbar />
        <main className="content-area">{children}</main>
      </div>
    </div>
  );
}

export default Layout;