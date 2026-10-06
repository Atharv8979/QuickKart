import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useNotification } from '../../context/NotificationContext';
import {
  Mail,
  Lock,
  KeyRound,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  MailCheck,
} from 'lucide-react';

const STEP_META = {
  1: {
    title: 'Reset your password',
    subtitle:
      'Enter the email address linked to your QuickKart account and we will send you a 6-digit verification code.',
  },
  2: {
    title: 'Enter your verification code',
    subtitle:
      'We sent a 6-digit code to your inbox. It expires shortly, so enter it below to continue.',
  },
  3: {
    title: 'Choose a new password',
    subtitle: 'Your identity is verified. Pick a strong password you have not used before.',
  },
  4: {
    title: 'Password reset complete',
    subtitle: 'Your password has been updated. Redirecting you to the sign-in page...',
  },
};

export const ForgotPasswordPage = () => {
  const { addToast } = useNotification();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [devCode, setDevCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);

  // Self-rescheduling countdown for the "resend code" cooldown.
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const startCooldown = (seconds) => setCooldown(Math.max(0, Number(seconds) || 0));

  const handleRequestCode = async (event) => {
    if (event) event.preventDefault();

    if (!email.trim()) {
      addToast('Please enter your email address', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.requestPasswordReset(email.trim());

      if (res?.success) {
        setStep(2);
        setCode('');
        setDevCode(res.devCode || '');
        startCooldown(res.resendAfterSeconds || 60);

        if (res.devCode) {
          addToast(`Email delivery is not configured. Dev code: ${res.devCode}`, 'info', 12000);
        } else {
          addToast('Verification code sent! Please check your Gmail inbox (and spam folder).', 'success', 7000);
        }
      } else {
        addToast(res?.message || 'Unable to send the verification code', 'error');
        if (res?.retryAfter) startCooldown(res.retryAfter);
      }
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (event) => {
    event.preventDefault();
    const cleaned = code.replace(/\D/g, '');

    if (cleaned.length !== 6) {
      addToast('Please enter the full 6-digit code', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.verifyResetCode(email.trim(), cleaned);

      if (res?.success && res.resetToken) {
        setResetToken(res.resetToken);
        setStep(3);
        addToast('Code verified! Now choose your new password.', 'success');
      } else {
        addToast(res?.message || 'Invalid or expired verification code', 'error');
        setCode('');
      }
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'Verification failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();

    if (password.length < 6) {
      addToast('Password must be at least 6 characters long', 'error');
      return;
    }
    if (password !== confirmPassword) {
      addToast('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.resetPassword(resetToken, password, confirmPassword);

      if (res?.success) {
        setStep(4);
        addToast('Password reset successfully! You can now sign in.', 'success', 6000);
        setTimeout(() => navigate('/login'), 2600);
      } else {
        addToast(res?.message || 'Unable to reset your password', 'error');
      }
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const meta = STEP_META[step] || STEP_META[1];
  const progressStep = Math.min(step, 3);
  const steps = [
    { n: 1, label: 'Email' },
    { n: 2, label: 'Verify' },
    { n: 3, label: 'New Password' },
  ];

  return (
    <div className="max-w-md mx-auto my-12 px-4 space-y-6">
      <div className="text-center space-y-2">
        <img
          src="/logo.jpg"
          alt="QuickKart"
          className="w-12 h-12 rounded-2xl object-contain mx-auto shadow-md"
        />
        <h1 className="text-2xl font-black text-slate-900">{meta.title}</h1>
        <p className="text-xs text-slate-500 leading-relaxed">{meta.subtitle}</p>
      </div>

      {/* Step progress indicator */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((s, index) => (
          <React.Fragment key={s.n}>
            <div className="flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border transition-all ${
                  progressStep > s.n
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : progressStep === s.n
                      ? 'bg-brand-600 border-brand-600 text-white'
                      : 'bg-white border-slate-300 text-slate-400'
                }`}
              >
                {progressStep > s.n ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.n}
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  progressStep >= s.n ? 'text-slate-700' : 'text-slate-400'
                }`}
              >
                {s.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-6 h-0.5 rounded-full ${progressStep > s.n ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        {/* ---------- STEP 1: request the verification code ---------- */}
        {step === 1 && (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold text-xs shadow-md shadow-brand-500/25 transition-all flex items-center justify-center gap-1.5"
            >
              {loading ? 'Sending Code...' : 'Send Verification Code'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        )}
        {/* ---------- STEP 2: verify the 6-digit code ---------- */}
        {step === 2 && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-2xl bg-sky-50 border border-sky-200">
              <MailCheck className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-sky-900 leading-relaxed">
                Code sent to <span className="font-bold">{email.trim()}</span>. It expires in a few minutes and can
                only be used once.
              </p>
            </div>

            {devCode && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300">
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  <span className="font-bold">Email delivery is not configured.</span> Development code:{' '}
                  <span className="font-mono font-black tracking-widest">{devCode}</span>
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                6-Digit Verification Code
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-lg font-mono font-bold tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold text-xs shadow-md shadow-brand-500/25 transition-all flex items-center justify-center gap-1.5"
            >
              {loading ? 'Verifying...' : 'Verify Code'}
              {!loading && <ShieldCheck className="w-4 h-4" />}
            </button>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setCode('');
                  setDevCode('');
                  setCooldown(0);
                }}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Change email
              </button>

              <button
                type="button"
                disabled={cooldown > 0 || loading}
                onClick={handleRequestCode}
                className="text-[11px] font-bold text-brand-600 hover:text-brand-800 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </button>
            </div>
          </form>
        )}
        {/* ---------- STEP 3: set the new password ---------- */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-emerald-900 leading-relaxed">
                Identity verified for <span className="font-bold">{email.trim()}</span>. Choose a new password
                below.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  autoFocus
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              {confirmPassword.length > 0 && confirmPassword !== password && (
                <p className="mt-1 text-[11px] font-bold text-rose-600">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold text-xs shadow-md shadow-brand-500/25 transition-all flex items-center justify-center gap-1.5"
            >
              {loading ? 'Updating Password...' : 'Reset Password'}
              {!loading && <CheckCircle2 className="w-4 h-4" />}
            </button>
          </form>
        )}

        {/* ---------- STEP 4: success ---------- */}
        {step === 4 && (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Your QuickKart password has been updated. Use your new password the next time you sign in.
            </p>
            <Link
              to="/login"
              className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/25 transition-all flex items-center justify-center gap-1.5"
            >
              Continue to Sign In <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}


      </div>

      <div className="text-center text-xs text-slate-500">
        Remembered your password?{' '}
        <Link to="/login" className="font-bold text-brand-600 hover:underline">
          Back to Sign In
        </Link>
      </div>
    </div>
  );
};
