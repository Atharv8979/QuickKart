import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { User, Store, Mail, Lock, Phone, MapPin } from 'lucide-react';

export const RegisterPage = () => {
  const { register } = useAuth();
  const { addToast } = useNotification();
  const navigate = useNavigate();

  const [role, setRole] = useState('customer'); // 'customer' | 'shopkeeper'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      addToast('Please fill in all required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        name,
        email,
        phone,
        password,
        role,
      });

      if (res?.success) {
        addToast(`Account created as ${role}!`, 'success');
        if (role === 'shopkeeper') navigate('/shop/dashboard');
        else navigate('/customer/search');
      } else {
        addToast(res?.message || 'Registration failed', 'error');
      }
    } catch (err) {
      addToast(
        err?.response?.data?.message || err?.message || 'Registration failed. Please try again.',
        'error'
      );
    } finally {
      setLoading(false);
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
        <h1 className="text-2xl font-black text-slate-900">Create QuickKart Account</h1>
        <p className="text-xs text-slate-500">
          Join your local commerce discovery network
        </p>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        {/* Role Toggle Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 text-center">
            I Want to Register As:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRole('customer')}
              className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 ${
                role === 'customer'
                  ? 'border-brand-500 bg-brand-50 text-brand-900 font-bold ring-2 ring-brand-500/20'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <User className={`w-5 h-5 ${role === 'customer' ? 'text-brand-600' : 'text-slate-400'}`} />
              <span className="text-xs">Shopper / Customer</span>
            </button>

            <button
              type="button"
              onClick={() => setRole('shopkeeper')}
              className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 ${
                role === 'shopkeeper'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-500/20'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Store className={`w-5 h-5 ${role === 'shopkeeper' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span className="text-xs">Shop Owner</span>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Full Name / Business Owner *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Sharma"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Mobile Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 9876543210"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              required
              minLength="6"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/25 transition-all flex items-center justify-center gap-1.5"
          >
            {loading ? 'Creating Account...' : `Register as ${role === 'shopkeeper' ? 'Shop Owner' : 'Customer'}`}
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-brand-600 hover:underline">
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
};
