import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  loadToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, user } = res.data;
    await AsyncStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    set({ user, token });
  },

  register: async (email, password, name) => {
    const res = await api.post('/auth/register', { email, password, name });
    const { token, user } = res.data;
    await AsyncStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    set({ user, token });
  },

  logout: async () => {
    await AsyncStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    set({ user: null, token: null });
  },

  loadToken: async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const res = await api.get('/auth/me').catch(() => null);
        set({ token, user: res?.data?.user || null, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
