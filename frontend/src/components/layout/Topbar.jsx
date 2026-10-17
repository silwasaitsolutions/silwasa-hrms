import { Menu, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import useAuth from '../../hooks/useAuth.js';
import useAuthStore from '../../store/authStore.js';
import * as authApi from '../../api/auth.js';

export default function Topbar({ onMenuClick }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const refreshToken = useAuthStore((s) => s.refreshToken);

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(refreshToken),
    onSettled: () => {
      clearAuth();
      navigate('/login');
    },
  });

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
      <button className="lg:hidden text-slate-500" onClick={onMenuClick}>
        <Menu size={22} />
      </button>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <User size={16} />
          <span>{user?.email}</span>
          <span className="badge bg-primary-50 text-primary-700 capitalize">{user?.role}</span>
        </div>
        <button
          onClick={() => logoutMutation.mutate()}
          className="btn-secondary px-3 py-1.5"
          title="Logout"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
