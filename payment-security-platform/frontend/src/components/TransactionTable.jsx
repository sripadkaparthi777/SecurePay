import React from 'react';

export default function TransactionTable({ transactions = [], onViewSecurity }) {
  return (
    <div className="transaction-table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Transaction ID</th>
            <th>Sender</th>
            <th>Receiver</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Security</th>
          </tr>
        </thead>

        <tbody>
          {transactions.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                No payment transactions yet.
              </td>
            </tr>
          ) : (
            transactions.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{row.id}</strong>
                </td>

                <td>{row.sender}</td>

                <td>{row.receiver}</td>

                <td>
                  ₹{Number(row.amount || 0).toFixed(2)}
                </td>

                <td>
                  <span
                    className={`transaction-status ${(row.status || 'Completed').toLowerCase()}`}
                  >
                    {row.status || 'Completed'}
                  </span>
                </td>

                <td>
                  <button
                    className="security-button"
                    onClick={() => onViewSecurity(row)}
                  >
                    View Security
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}