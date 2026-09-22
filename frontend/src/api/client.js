const API_BASE = '/api/v1';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('aqua_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (err) {
    throw err;
  }
}

export const api = {
  // Auth
  register: (body) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => apiRequest('/auth/me'),
  updateWallet: (body) => apiRequest('/auth/update-wallet', { method: 'POST', body: JSON.stringify(body) }),

  // Plans
  getPlans: () => apiRequest('/plans'),
  getPlan: (id) => apiRequest(`/plans/${id}`),

  // Investments
  getInvestments: () => apiRequest('/investments'),
  createInvestment: (body) => apiRequest('/investments/create', { method: 'POST', body: JSON.stringify(body) }),

  // Deposits
  getDepositAddress: () => apiRequest('/deposits/system-address'),
  getDeposits: () => apiRequest('/deposits'),
  submitDeposit: (body) => apiRequest('/deposits/submit', { method: 'POST', body: JSON.stringify(body) }),

  // Withdrawals
  getWithdrawals: () => apiRequest('/withdrawals'),
  previewWithdrawal: (amount) => apiRequest(`/withdrawals/preview?amount=${amount}`),
  requestWithdrawal: (body) => apiRequest('/withdrawals', { method: 'POST', body: JSON.stringify(body) }),

  // Referrals
  getReferralStats: () => apiRequest('/referrals/stats'),
  getReferralCommissions: () => apiRequest('/referrals/commissions'),

  // Ledger
  getLedger: (limit = 100) => apiRequest(`/ledger?limit=${limit}`),

  // Admin
  getAdminDashboard: () => apiRequest('/admin/dashboard'),
  getAdminDeposits: (status = 'ALL') => apiRequest(`/admin/deposits?status=${status}`),
  approveDeposit: (id, body) => apiRequest(`/admin/deposits/${id}/approve`, { method: 'POST', body: JSON.stringify(body) }),
  rejectDeposit: (id, body) => apiRequest(`/admin/deposits/${id}/reject`, { method: 'POST', body: JSON.stringify(body) }),

  getAdminWithdrawals: (status = 'ALL') => apiRequest(`/admin/withdrawals?status=${status}`),
  processWithdrawal: (id, body) => apiRequest(`/admin/withdrawals/${id}/process`, { method: 'POST', body: JSON.stringify(body) }),
  rejectWithdrawal: (id, body) => apiRequest(`/admin/withdrawals/${id}/reject`, { method: 'POST', body: JSON.stringify(body) }),

  getAdminUsers: (search = '') => apiRequest(`/admin/users?search=${encodeURIComponent(search)}`),
  getAdminUserDetail: (id) => apiRequest(`/admin/users/${id}`),
  adjustUserBalance: (id, body) => apiRequest(`/admin/users/${id}/adjust-balance`, { method: 'POST', body: JSON.stringify(body) }),
  updateUserStatus: (id, body) => apiRequest(`/admin/users/${id}/status`, { method: 'POST', body: JSON.stringify(body) }),

  getAdminPlans: () => apiRequest('/admin/plans'),
  updateAdminPlan: (id, body) => apiRequest(`/admin/plans/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  getAdminReferrals: () => apiRequest('/admin/referrals'),
  getAdminAuditLogs: () => apiRequest('/admin/audit-logs'),
  runDailyEngine: () => apiRequest('/admin/engine/run-daily', { method: 'POST' }),
  getAdminWallet: () => apiRequest('/admin/wallet'),
  updateAdminWallet: (body) => apiRequest('/admin/wallet', { method: 'POST', body: JSON.stringify(body) }),
  getAdminSettings: () => apiRequest('/admin/settings'),
  updateAdminSettings: (body) => apiRequest('/admin/settings', { method: 'POST', body: JSON.stringify(body) })
};
