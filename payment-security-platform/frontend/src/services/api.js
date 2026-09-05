import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5002/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to all requests if available
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('securepay_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle authentication expiry
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear expired or invalid token
      // Avoid redirect loops on public login checks
    }
    return Promise.reject(error);
  }
);

// API Helper Functions
export const api = {
  // Authentication
  async login(email, password) {
    const res = await apiClient.post('/auth/login', { email, password });
    if (res.data?.token) {
      localStorage.setItem('securepay_token', res.data.token);
    }
    return res.data;
  },

  async getMe() {
    const res = await apiClient.get('/me');
    return res.data;
  },

  logout() {
    localStorage.removeItem('securepay_token');
    localStorage.removeItem('paymentUser');
  },

  // Accounts
  async getMyAccount() {
    const res = await apiClient.get('/accounts/me');
    return res.data;
  },

  async addMoney(amount) {
    const res = await apiClient.post('/accounts/add-money', { amount: Number(amount) });
    return res.data;
  },

  // Payments
  async sendPayment({ receiverUpi, amount, idempotencyKey, note }) {
    const res = await apiClient.post('/payment/send', {
      receiverUpi,
      amount: Number(amount),
      idempotencyKey,
      note,
    });
    return res.data;
  },

  // Transactions
  async getMyTransactions() {
    const res = await apiClient.get('/transactions/me');
    return res.data;
  },

  async getAllTransactions() {
    const res = await apiClient.get('/transactions/all');
    return res.data;
  },

  async getTransactionById(transactionId) {
    const res = await apiClient.get(`/transactions/${transactionId}`);
    return res.data;
  },

  // Security Scan
  async runSecurityScan() {
    const res = await apiClient.post('/security-scan');
    return res.data;
  },
  // AI Security Analysis
  async analyzeSecurity(transaction, apiResponse) {
    const res = await apiClient.post('/analyze-security', {
      transaction,
      apiResponse,
    });
    return res.data;
  },
};

export default apiClient;

