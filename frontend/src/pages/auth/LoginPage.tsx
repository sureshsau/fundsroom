import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TrendingUp, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { authApi } from '../../api';
import { useAuth } from '../../context/AppContext';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors }, setError, setValue } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(data);
      const { token, user } = res.data.data;
      login(token, user);
      toast.success(`Welcome back, ${user.name}!`);
      navigate('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const message = error.response?.data?.message || 'Invalid credentials';
      setError('root', { message });
    } finally {
      setIsLoading(false);
    }
  };

  const testAccounts = [
    { role: 'Admin', email: 'admin@gmail.com', pass: 'Admin@123' },
    { role: 'Sales', email: 'sales@gmail.com', pass: 'Sales@123' },
    { role: 'Warehouse', email: 'warehouse@gmail.com', pass: 'Warehouse@123' },
    { role: 'User', email: 'sureshsau7586@gmail.com', pass: 'Warehouse@123' },
  ];

  const handleFillCredentials = (email: string, pass: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', pass, { shouldValidate: true });
    toast.success(`Filled ${email}`);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <TrendingUp size={24} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b' }}>ERP Portal</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>Operations Management System</div>
          </div>
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem' }}>
          Sign in to your account
        </h2>

        {errors.root && (
          <div style={{
            background: '#fee2e2', border: '1px solid #fecaca',
            borderRadius: 8, padding: '10px 14px', marginBottom: '1rem',
            display: 'flex', gap: 8, alignItems: 'center', color: '#dc2626', fontSize: 14
          }}>
            <AlertCircle size={16} />
            {errors.root.message}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label className="form-label required">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                {...register('email')}
                type="email"
                className={`form-input ${errors.email ? 'error' : ''}`}
                style={{ paddingLeft: 38 }}
                placeholder="admin@gmail.com"
                autoComplete="email"
              />
            </div>
            {errors.email && <div className="form-error"><AlertCircle size={12} />{errors.email.message}</div>}
          </div>

          <div className="form-group">
            <label className="form-label required">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                className={`form-input ${errors.password ? 'error' : ''}`}
                style={{ paddingLeft: 38, paddingRight: 40 }}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <div className="form-error"><AlertCircle size={12} />{errors.password.message}</div>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <Link to="/forgot-password" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none' }}>
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '11px', fontSize: 15, fontWeight: 600, justifyContent: 'center' }}
          >
            {isLoading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="spinner" style={{
                  width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite'
                }} />
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        {/* Dev credentials hint */}
        <div style={{ marginTop: '1.5rem', padding: '12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Test Credentials (Click to autofill)</div>
          {testAccounts.map((c) => (
            <button
              key={c.role}
              type="button"
              onClick={() => handleFillCredentials(c.email, c.pass)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', background: 'none',
                border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 4,
                fontSize: 11, color: '#2563eb', textDecoration: 'none', marginBottom: 2
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#eff6ff')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <strong style={{ color: '#475569' }}>{c.role}:</strong> {c.email} / {c.pass}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
