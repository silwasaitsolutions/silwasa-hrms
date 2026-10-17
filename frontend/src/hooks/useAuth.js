import useAuthStore from '../store/authStore.js';

export default function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = !!useAuthStore((s) => s.accessToken);
  const isAdmin = user?.role === 'admin';
  return { user, isAuthenticated, isAdmin };
}
