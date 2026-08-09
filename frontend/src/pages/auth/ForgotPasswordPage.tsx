import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TrendingUp, Mail, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { authApi } from '../../api';
import toast from 'react-hot-toast';

type Step = 'email' | 'otp' | 'newPassword';

export const ForgotPasswordPage: React.FC = () => {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await authApi.forgotPassword({ email });
      toast.success('OTP sent to your email!');
      setStep('otp');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to send OTP');
    } finally { setIsLoading(false); }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (otp.length !== 6) { setError('Enter the 6-digit OTP'); return; }
    setStep('newPassword');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    setIsLoading(true);
    try {
      await authApi.resetPassword({ email, otp, newPassword });
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to reset password');
    } finally { setIsLoading(false); }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <TrendingUp size={24} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b' }}>ERP Portal</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>Password Recovery</div>
          </div>
        </div>

        <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b', textDecoration: 'none', marginBottom: '1.5rem' }}>
          <ArrowLeft size={14} />
          Back to login
        </Link>

        {step === 'email' && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Forgot Password</h2>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: '1.5rem' }}>Enter your email address and we'll send a verification code.</p>
            {error && (
              <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: '1rem', display: 'flex', gap: 8, alignItems: 'center', color: '#dc2626', fontSize: 14 }}>
                <AlertCircle size={16} />{error}
              </div>
            )}
            <form onSubmit={handleSendOtp}>
              <div className="form-group">
                <label className="form-label required">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="form-input" style={{ paddingLeft: 38 }} placeholder="your@email.com" required />
                </div>
              </div>
              <button type="submit" disabled={isLoading} className="btn btn-primary" style={{ width: '100%', padding: '11px', justifyContent: 'center', fontSize: 15 }}>
                {isLoading ? 'Sending...' : 'Send Reset OTP'}
              </button>
            </form>
          </>
        )}

        {step === 'otp' && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Enter OTP</h2>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: '1.5rem' }}>A 6-digit code was sent to <strong>{email}</strong>. Valid for 10 minutes.</p>
            {error && (
              <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: '1rem', display: 'flex', gap: 8, alignItems: 'center', color: '#dc2626', fontSize: 14 }}>
                <AlertCircle size={16} />{error}
              </div>
            )}
            <form onSubmit={handleVerifyOtp}>
              <div className="form-group">
                <label className="form-label required">6-Digit OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="form-input"
                  style={{ textAlign: 'center', fontSize: 24, letterSpacing: 12, fontWeight: 700 }}
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '11px', justifyContent: 'center', fontSize: 15 }}>
                Verify OTP
              </button>
              <button type="button" onClick={handleSendOtp} className="btn btn-ghost" style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}>
                Resend OTP
              </button>
            </form>
          </>
        )}

        {step === 'newPassword' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={20} color="#059669" />
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>New Password</h2>
                <p style={{ fontSize: 13, color: '#64748b' }}>OTP verified. Set a new password.</p>
              </div>
            </div>
            {error && (
              <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: '1rem', display: 'flex', gap: 8, alignItems: 'center', color: '#dc2626', fontSize: 14 }}>
                <AlertCircle size={16} />{error}
              </div>
            )}
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label className="form-label required">New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="form-input" placeholder="Min 8 characters" required />
              </div>
              <div className="form-group">
                <label className="form-label required">Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="form-input" placeholder="Repeat password" required />
              </div>
              <button type="submit" disabled={isLoading} className="btn btn-primary" style={{ width: '100%', padding: '11px', justifyContent: 'center', fontSize: 15 }}>
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
