import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import {
  Search,
  MapPin,
  Sparkles,
  Store,
  ShieldCheck,
  Zap,
  ShoppingBag,
  MessageSquare,
  Clock,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { chatService } from '../../services/chatService';
import { BroadcastRequestModal } from '../../components/customer/BroadcastRequestModal';

export const LandingPage = () => {
  const { demoLogin, isAuthenticated, role } = useAuth();
  const { addressText, radiusKm, setRadiusKm } = useLocation();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);

  const categories = [
    { name: 'Hardware & Tools', icon: '🔨', desc: 'Drills, fasteners, tools' },
    { name: 'Plumbing & Sanitary', icon: '🔧', desc: 'Pipes, valves, taps' },
    { name: 'Electrical & Lighting', icon: '⚡', desc: 'Wires, LED, switches' },
    { name: 'Stationery & Office', icon: '📚', desc: 'Notebooks, pens, art' },
    { name: 'Groceries & Essentials', icon: '🛒', desc: 'Daily pantry items' },
    { name: 'Electronics & Mobiles', icon: '📱', desc: 'Cables, chargers, parts' },
  ];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/customer/search?q=${encodeURIComponent(searchTerm)}`);
    } else {
      navigate('/customer/search');
    }
  };

  const handleQuickDemo = async (roleKey) => {
    await demoLogin(roleKey);
    if (roleKey === 'customer') navigate('/customer/search');
    else if (roleKey === 'sharma' || roleKey === 'gupta') navigate('/shop/dashboard');
    else if (roleKey === 'admin') navigate('/admin/dashboard');
  };

  const handleStartChat = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      const res = await chatService.getOrCreateConversation({
        shopId: null,
        productName: 'QuickKart Store',
        price: 0,
      });
      if (res.success) {
        navigate(`/customer/messages?c=${res.conversation._id}`);
      }
    } catch (err) {
      console.error('Error opening chat:', err);
    }
  };

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-brand-50/60 via-white to-slate-50 overflow-hidden">
        {/* Background decorative glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-400/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          {/* Logo & Headline */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-100/80 text-brand-800 text-xs font-bold border border-brand-200 shadow-sm animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span>Hyperlocal Product Discovery & Shop-Customer Connectivity</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-none">
            “Find Nearby. Compare Prices. <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-teal-500 to-brand-500">
              Buy Quickly.”
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Stop visiting 5 physical shops or waiting days for delivery. Check real-time stock in your neighborhood, broadcast custom requests, compare quotes side-by-side, and hold items before you visit.
          </p>

          {/* Search-First Discovery Bar */}
          <div className="max-w-2xl mx-auto pt-2">
            <form
              onSubmit={handleSearchSubmit}
              className="bg-white p-2 rounded-2xl shadow-xl border border-slate-200/90 flex flex-col sm:flex-row items-center gap-2"
            >
              <div className="flex items-center gap-2 px-3 w-full sm:w-auto flex-1">
                <Search className="w-5 h-5 text-brand-600 flex-shrink-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="What are you looking for? (e.g. 1-inch PVC pipe, drill kit, LED bulb...)"
                  className="w-full text-sm font-medium py-2 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-md shadow-brand-500/25 transition-all flex items-center justify-center gap-1.5"
                >
                  <Search className="w-4 h-4" />
                  Find Nearby
                </button>
                <button
                  onClick={handleStartChat}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold shadow-md transition-all flex items-center justify-center gap-1.5"
                  title="Start a chat with a store"
                >
                  <MessageSquare className="w-4 h-4" />
                  Chat
                </button>
              </div>
            </form>

            <div className="flex items-center justify-between text-xs text-slate-500 px-3 mt-2">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-brand-600" /> Searching around:{' '}
                <strong className="text-slate-700">{addressText}</strong>
              </span>
              <button
                onClick={() => setIsBroadcastOpen(true)}
                className="text-brand-600 font-bold hover:underline"
              >
                ⚡ Broadcast Request Directly &rarr;
              </button>
            </div>
          </div>

          {/* Instant Role Preview Callouts */}
          <div className="pt-8 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <button
              onClick={() => handleQuickDemo('customer')}
              className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-brand-300 transition-all group"
            >
              <span className="text-[10px] font-black uppercase tracking-wider text-brand-600">
                Persona 1 • Customer
              </span>
              <h4 className="font-bold text-slate-900 text-sm mt-0.5 group-hover:text-brand-600">
                Explore as Rahul Sharma
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Search nearby hardware, broadcast request & hold items.
              </p>
            </button>

            <button
              onClick={() => handleQuickDemo('sharma')}
              className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all group"
            >
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
                Persona 2 • Shopkeeper
              </span>
              <h4 className="font-bold text-slate-900 text-sm mt-0.5 group-hover:text-emerald-600">
                Sharma Hardware Store
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                View live queue, manage inventory & respond to quotes.
              </p>
            </button>

            <button
              onClick={() => handleQuickDemo('admin')}
              className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-purple-300 transition-all group"
            >
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-600">
                Persona 3 • Admin Hub
              </span>
              <h4 className="font-bold text-slate-900 text-sm mt-0.5 group-hover:text-purple-600">
                Platform Moderator
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Verify newly registered stores & monitor platform KPIs.
              </p>
            </button>
          </div>
        </div>
      </section>

      {/* Category Pills Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-slate-900">Explore by Category</h3>
          <Link to="/customer/search" className="text-xs font-bold text-brand-600 hover:underline">
            View All Categories &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {categories.map((c) => (
            <Link
              key={c.name}
              to={`/customer/search?category=${encodeURIComponent(c.name)}`}
              className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-400 transition-all flex flex-col items-center text-center group"
            >
              <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                {c.icon}
              </span>
              <h4 className="font-bold text-xs text-slate-900 leading-tight group-hover:text-brand-600">
                {c.name}
              </h4>
              <span className="text-[10px] text-slate-400 mt-1">{c.desc}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* How QuickKart Works - 4 Steps (Chapter 3.4 & Fig 3.1) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 bg-slate-900 rounded-3xl text-white relative overflow-hidden">
        <div className="max-w-3xl mx-auto text-center space-y-3 mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-400">
            Friction-Free Hyperlocal Architecture
          </span>
          <h2 className="text-2xl sm:text-3xl font-black">
            How QuickKart Bridges Online Search to Offline Shops
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Unlike e-commerce giants that bypass local economies, QuickKart directs footfall straight to your local shops.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/80 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-brand-500/20 text-brand-400 font-black text-sm flex items-center justify-center border border-brand-500/30">
              1
            </div>
            <h4 className="font-bold text-sm text-white">Search or Broadcast</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Find items across catalog or broadcast a single structured request with your budget and urgency.
            </p>
          </div>

          <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/80 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 font-black text-sm flex items-center justify-center border border-teal-500/30">
              2
            </div>
            <h4 className="font-bold text-sm text-white">Compare Side-by-Side</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Nearby shopkeepers respond with price quotes and readiness ETA. View the automatic "Best Value" highlight.
            </p>
          </div>

          <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/80 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 font-black text-sm flex items-center justify-center border border-amber-500/30">
              3
            </div>
            <h4 className="font-bold text-sm text-white">Hold Item & Chat</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Directly chat for specifications and place a 60-minute in-store hold so it's not sold before you arrive.
            </p>
          </div>

          <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/80 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 font-black text-sm flex items-center justify-center border border-emerald-500/30">
              4
            </div>
            <h4 className="font-bold text-sm text-white">Visit, Inspect & Buy</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Walk to the nearby shop, show your reservation code, inspect the product, pay at the counter and take it home.
            </p>
          </div>
        </div>
      </section>

      {/* Broadcast Modal trigger */}
      <BroadcastRequestModal
        isOpen={isBroadcastOpen}
        onClose={() => setIsBroadcastOpen(false)}
        onSuccess={(req) => navigate('/customer/requests')}
      />
    </div>
  );
};
