import { create } from 'zustand';
import api from '../services/api';

interface TelegramAccount {
  id: string;
  phoneNumber: string;
  displayName: string | null;
  username: string | null;
  isActive: boolean;
  isMaster: boolean;
  accountGroup: string | null;
  status: string;
  lastActiveAt: string | null;
  createdAt: string;
}

interface AccountState {
  accounts: TelegramAccount[];
  isLoading: boolean;
  fetchAccounts: () => Promise<void>;
  setMaster: (id: string) => Promise<void>;
  updateAccount: (id: string, data: Partial<TelegramAccount>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  sendCode: (phoneNumber: string) => Promise<{ loginId: string }>;
  verifyCode: (loginId: string, code: string) => Promise<any>;
  verifyPassword: (loginId: string, password: string) => Promise<any>;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  isLoading: false,

  fetchAccounts: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get('/accounts');
      set({ accounts: res.data.accounts, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  setMaster: async (id) => {
    // Unset current master
    const { accounts } = get();
    for (const acc of accounts) {
      if (acc.isMaster) {
        await api.put(`/accounts/${acc.id}`, { isMaster: false });
      }
    }
    await api.put(`/accounts/${id}`, { isMaster: true });
    await get().fetchAccounts();
  },

  updateAccount: async (id, data) => {
    await api.put(`/accounts/${id}`, data);
    await get().fetchAccounts();
  },

  deleteAccount: async (id) => {
    await api.delete(`/accounts/${id}`);
    await get().fetchAccounts();
  },

  sendCode: async (phoneNumber) => {
    const res = await api.post('/accounts/login/send-code', { phoneNumber });
    return res.data;
  },

  verifyCode: async (loginId, code) => {
    const res = await api.post('/accounts/login/verify', { loginId, code });
    if (res.data.account) {
      await get().fetchAccounts();
    }
    return res.data;
  },

  verifyPassword: async (loginId, password) => {
    const res = await api.post('/accounts/login/verify-password', { loginId, password });
    if (res.data.account) {
      await get().fetchAccounts();
    }
    return res.data;
  },
}));
