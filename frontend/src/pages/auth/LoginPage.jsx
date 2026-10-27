import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import * as authApi from '../../api/auth.js';
import useAuthStore from '../../store/authStore.js';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: ({ email, password }) => authApi.login(email, password),
    onSuccess: (data) => {
      setAuth(data);
      navigate('/dashboard');
    },
  });

  const onSubmit = (data) => mutation.mutate(data);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm card p-8">
        <div className="flex flex-col items-center mb-6">
          {/* Updated Logo Image */}
          <img
            src="/images/mindkraftlogo-new.webp"
            alt="Mindkraft Logo"
            className="h-16 w-auto object-contain mb-3"
          />
          <h1 className="text-xl font-semibold text-slate-900">Sign in to HRMS</h1>
          <p className="text-sm text-slate-500 mt-1">Employee Management System</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="you@company.com"
              {...register('email')}
            />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              {...register('password')}
            />
            {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
          </div>

          {mutation.isError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {mutation.error?.response?.data?.message || 'Login failed'}
            </p>
          )}

          <button type="submit" disabled={mutation.isPending} className="btn-primary w-full">
            <LogIn size={16} />
            {mutation.isPending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        
      </div>
    </div>
  );
}
