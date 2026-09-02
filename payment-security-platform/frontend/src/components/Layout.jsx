import React from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

function Layout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrapper">
        <Navbar />
        <main className="content-area">{children}</main>
      </div>
    </div>
  );
}

export default Layout;
