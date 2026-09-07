import React, { useState } from 'react';

export default function Payment() {
  const [form, setForm] = useState({
    sender: '',
    receiver: '',
    amount: '',
    txId: '',
  });
  const [status, setStatus] = useState('');
  const [transactions, setTransactions] = useState([
    { id: 'TX-001', status: 'Completed' },
    { id: 'TX-002', status: 'Pending' },
  ]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.sender || !form.receiver || !form.amount || !form.txId) {
      setStatus('Validation error: please fill all required fields.');
      return;
    }

    const amountNum = Number(form.amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      setStatus('Invalid amount: amount must be greater than 0.');
      return;
    }

    if (amountNum > 10000000) {
      setStatus('Warning: extremely large amount detected. Transaction not submitted.');
      return;
    }

    if (transactions.some((t) => t.id === form.txId)) {
      setStatus('Validation error: Transaction ID must be unique.');
      return;
    }

    const newTransaction = {
      id: form.txId,
      status: 'Completed',
    };

    setTransactions([newTransaction, ...transactions]);

    setForm({
      sender: '',
      receiver: '',
      amount: '',
      txId: '',
    });

    setStatus('Mock payment sent successfully.');
  };

  return (
    <div>
      <h1>Dummy Payment</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Sender Account</label>
          <input
            value={form.sender}
            onChange={(e) => setForm({ ...form, sender: e.target.value })}
          />
        </div>
        <div>
          <label>Receiver Account</label>
          <input
            value={form.receiver}
            onChange={(e) => setForm({ ...form, receiver: e.target.value })}
          />
        </div>
        <div>
          <label>Amount</label>
          <input
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </div>
        <div>
          <label>Transaction ID</label>
          <input
            value={form.txId}
            onChange={(e) => setForm({ ...form, txId: e.target.value })}
          />
        </div>
        <button type="submit">Send Payment</button>
      </form>
      <p>{status}</p>
      <h2>Payment History</h2>
      <ul>
        {transactions.map((tx) => (
          <li key={tx.id}>
            {tx.id} - {tx.status}
          </li>
        ))}
      </ul>
    </div>
  );
}
