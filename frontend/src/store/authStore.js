import { create } from 'zustand';

// Simple in-memory + localStorage-backed auth store.
const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('hrms_user') || 'null'),
  accessToken: localStorage.getItem('hrms_access_token') || null,
  refreshToken: localStorage.getItem('hrms_refresh_token') || null,

  setAuth: ({ user, accessToken, refreshToken }) => {
    localStorage.setItem('hrms_user', JSON.stringify(user));
    localStorage.setItem('hrms_access_token', accessToken);
    if (refreshToken) localStorage.setItem('hrms_refresh_token', refreshToken);
    set({ user, accessToken, refreshToken: refreshToken || undefined });
  },

  setAccessToken: (accessToken) => {
    localStorage.setItem('hrms_access_token', accessToken);
    set({ accessToken });
  },

  clearAuth: () => {
    localStorage.removeItem('hrms_user');
    localStorage.removeItem('hrms_access_token');
    localStorage.removeItem('hrms_refresh_token');
    set({ user: null, accessToken: null, refreshToken: null });
  },
}));

export default useAuthStore;
