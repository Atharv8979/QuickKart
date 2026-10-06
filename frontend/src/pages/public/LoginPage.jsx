import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  Lock,
  Mail,
  User,
  Store,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export const LoginPage = () => {
  const { login, demoLogin } = useAuth();
  const { addToast } = useNotification();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('Please enter both email and password', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await login(email, password);
      if (res?.success) {
        addToast(`Welcome back, ${res.user.name}!`, 'success');
        if (res.user.role === 'shopkeeper') navigate('/shop/dashboard');
        else if (res.user.role === 'admin') navigate('/admin/dashboard');
        else navigate('/customer/search');
      } else {
        addToast(res?.message || 'Invalid credentials', 'error');
      }
    } catch (err) {
      addToast(
        err?.response?.data?.message || err?.message || 'Login failed. Please try again.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDemoClick = async (roleKey) => {
    const res = await demoLogin(roleKey);
    if (res.success) {
      addToast(`Logged in as ${res.user.name} (${res.user.role})`, 'success');
      if (roleKey === 'customer') navigate('/customer/search');
      else if (roleKey === 'sharma' || roleKey === 'gupta') navigate('/shop/dashboard');
      else if (roleKey === 'admin') navigate('/admin/dashboard');
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 px-4 space-y-6">
      <div className="text-center space-y-2">
        <img
          src="/logo.jpg"
          alt="QuickKart"
          className="w-12 h-12 rounded-2xl object-contain mx-auto shadow-md"
        />
        <h1 className="text-2xl font-black text-slate-900">Sign in to QuickKart</h1>
        <p className="text-xs text-slate-500">
          Hyperlocal Product Discovery & Shop-Customer Connectivity
        </p>
      </div>

      {/* 1-Click Fast Persona Switchers */}
      <div className="bg-gradient-to-br from-brand-50 via-sky-50 to-teal-50 p-4 rounded-3xl border border-brand-200/80 shadow-sm space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-black text-brand-900">
          <Sparkles className="w-4 h-4 text-brand-600" />
          <span>Evaluation Demo: 1-Click Test Logins</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <button
            type="button"
            onClick={() => handleDemoClick('customer')}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-brand-200 font-bold text-slate-800 text-left transition-all shadow-xs flex flex-col items-start gap-1"
          >
            <User className="w-4 h-4 text-brand-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-[11px] leading-tight">Customer</p>
              <p className="text-[10px] text-slate-400 font-normal">Rahul Sharma</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleDemoClick('sharma')}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-emerald-200 font-bold text-slate-800 text-left transition-all shadow-xs flex flex-col items-start gap-1"
          >
            <Store className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-[11px] leading-tight">Shopkeeper</p>
              <p className="text-[10px] text-slate-400 font-normal">Store Owner</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleDemoClick('admin')}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-purple-200 font-bold text-slate-800 text-left transition-all shadow-xs flex flex-col items-start gap-1"
          >
            <ShieldCheck className="w-4 h-4 text-purple-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-[11px] leading-tight">Admin HQ</p>
              <p className="text-[10px] text-slate-400 font-normal">Platform Admin</p>
            </div>
          </button>
        </div>
      </div>

      {/* Standard Login Form */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@quickkart.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-[11px] font-bold text-brand-600 hover:text-brand-800 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/25 transition-all flex items-center justify-center gap-1.5"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-brand-600 hover:underline">
            Register New Account
          </Link>
        </div>
      </div>
    </div>
  );
};
