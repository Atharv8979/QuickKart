import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation as useRouterLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { useNotification } from '../../context/NotificationContext';
import {
  MapPin,
  Search,
  MessageSquare,
  ShoppingBag,
  Bell,
  User,
  LogOut,
  Store,
  ShieldCheck,
  Zap,
  ChevronDown,
  Navigation,
  Check,
  Sparkles,
  Menu,
  X,
  Pencil,
} from 'lucide-react';

export const Navbar = () => {
  const { user, role, isAuthenticated, logout, demoLogin } = useAuth();
  const { addressText, radiusKm, setRadiusKm, selectPreset, detectCurrentLocation, isLocating, presetAreas } = useLocation();
  const { unreadCount } = useNotification();
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();

  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isDemoMenuOpen, setIsDemoMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const locationRef = useRef(null);
  const userMenuRef = useRef(null);
  const demoRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (locationRef.current && !locationRef.current.contains(e.target)) setIsLocationOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setIsUserMenuOpen(false);
      if (demoRef.current && !demoRef.current.contains(e.target)) setIsDemoMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDemoSwitch = async (roleKey) => {
    setIsDemoMenuOpen(false);
    await demoLogin(roleKey);
    if (roleKey === 'customer') navigate('/customer/search');
    else if (roleKey === 'sharma' || roleKey === 'gupta') navigate('/shop/dashboard');
    else if (roleKey === 'admin') navigate('/admin/dashboard');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 group">
            <img
              src="/logo.jpg"
              alt="QuickKart Logo"
              className="w-9 h-9 rounded-xl object-contain shadow-sm group-hover:scale-105 transition-transform"
            />
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-slate-900 leading-none">
                Quick<span className="text-brand-600">Kart</span>
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                Hyperlocal Discovery
              </span>
            </div>
          </Link>

          {/* Location Selector Pill */}
          <div className="relative hidden md:block" ref={locationRef}>
            <button
              onClick={() => setIsLocationOpen(!isLocationOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/90 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors max-w-[220px]"
            >
              <MapPin className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
              <span className="truncate">{addressText}</span>
              <span className="text-slate-400 font-normal">({radiusKm}km)</span>
              <ChevronDown className="w-3 h-3 text-slate-400 ml-auto" />
            </button>

            {/* Location Dropdown */}
            {isLocationOpen && (
              <div className="absolute top-full mt-2 left-0 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-50 animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Search Radius & Area
                  </span>
                  <button
                    onClick={detectCurrentLocation}
                    disabled={isLocating}
                    className="text-xs text-brand-600 font-bold hover:underline flex items-center gap-1"
                  >
                    <Navigation className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                    {isLocating ? 'Locating...' : 'Use GPS'}
                  </button>
                </div>

                {/* Radius Slider */}
                <div className="mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex justify-between text-xs font-medium text-slate-700 mb-1.5">
                    <span>Search Radius</span>
                    <span className="font-bold text-brand-600">{radiusKm} km</span>
                  </div>
                  <div className="flex gap-1.5">
                    {[1, 3, 5, 10, 20, 60].map((r) => (
                      <button
                        key={r}
                        onClick={() => setRadiusKm(r)}
                        className={`flex-1 py-1 text-xs font-semibold rounded-lg border transition-all ${
                          radiusKm === r
                            ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {r}km
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preset Localities */}
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  <span className="text-[11px] font-semibold text-slate-400 px-2 block mb-1">
                    Popular Localities
                  </span>
                  {presetAreas.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => {
                        selectPreset(preset);
                        setIsLocationOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-100 text-slate-700 font-medium flex items-center justify-between group"
                    >
                      <span className="truncate">{preset.name}</span>
                      {addressText === preset.name && (
                        <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Navigation Links based on Role */}
          <nav className="hidden lg:flex items-center gap-1">
            {role === 'customer' && (
              <>
                <Link
                  to="/customer/search"
                  className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    routerLocation.pathname.includes('/search')
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Explore Shops
                </Link>
                <Link
                  to="/customer/goal-planner"
                  className={`px-3 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-1 ${
                    routerLocation.pathname.includes('/goal-planner')
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-brand-600 hover:text-brand-700 hover:bg-brand-50/50'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                  AI Goal Agent
                </Link>
                <Link
                  to="/customer/diagnostics"
                  className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    routerLocation.pathname.includes('/diagnostics')
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Diagnostic Search
                </Link>
                <Link
                  to="/customer/requests"
                  className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    routerLocation.pathname.includes('/requests')
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  My Requests
                </Link>
                <Link
                  to="/customer/reservations"
                  className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    routerLocation.pathname.includes('/reservations')
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Product Holds
                </Link>
                <Link
                  to="/customer/messages"
                  className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    routerLocation.pathname.includes('/messages')
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Live Chat
                </Link>
              </>
            )}

            {role === 'shopkeeper' && (
              <>
                <Link
                  to="/shop/dashboard"
                  className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  Dashboard
                </Link>
                <Link
                  to="/shop/products"
                  className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  Inventory
                </Link>
                <Link
                  to="/shop/requests"
                  className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  Customer Requests
                </Link>
                <Link
                  to="/shop/reservations"
                  className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  Reservations
                </Link>
                <Link
                  to="/shop/messages"
                  className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  Messages
                </Link>
              </>
            )}

            {role === 'admin' && (
              <>
                <Link
                  to="/admin/dashboard"
                  className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  Admin Hub
                </Link>
                <Link
                  to="/admin/map"
                  className="px-3 py-2 rounded-xl text-sm font-bold text-brand-600 hover:text-brand-700 hover:bg-brand-50/50 flex items-center gap-1"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Regional Map
                </Link>
                <Link
                  to="/admin/users"
                  className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  Users
                </Link>
                <Link
                  to="/admin/shops"
                  className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  Stores
                </Link>
                <Link
                  to="/admin/products"
                  className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  Products
                </Link>
                <Link
                  to="/admin/reports"
                  className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  Sales & Reports
                </Link>
                <Link
                  to="/admin/categories"
                  className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  Categories
                </Link>
              </>
            )}

            {!isAuthenticated && (
              <>
                <Link
                  to="/customer/search"
                  className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  Explore Nearby
                </Link>
              </>
            )}
          </nav>

          {/* Action Tools: Quick Role Switcher + Auth Buttons */}
          <div className="flex items-center gap-2.5">
            {/* Demo Quick Switcher Dropdown */}
            <div className="relative" ref={demoRef}>
              <button
                onClick={() => setIsDemoMenuOpen(!isDemoMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-800 border border-amber-300 text-xs font-bold hover:bg-amber-100/50 transition-all shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Role Switcher</span>
                <ChevronDown className="w-3 h-3 text-amber-600" />
              </button>

              {isDemoMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2.5 z-50 animate-fade-in">
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="text-xs font-bold text-slate-800">1-Click Fast Test Logins</p>
                    <p className="text-[11px] text-slate-400">Switch persona instantly for review</p>
                  </div>

                  <div className="space-y-1">
                    <button
                      onClick={() => handleDemoSwitch('customer')}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                        role === 'customer'
                          ? 'bg-brand-50 text-brand-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-brand-600" />
                        <div>
                          <p>Customer (Rahul Sharma)</p>
                          <p className="text-[10px] text-slate-400 font-normal">Search, broadcast, holds</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleDemoSwitch('shopkeeper')}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                        user?.role === 'shopkeeper'
                          ? 'bg-emerald-50 text-emerald-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-emerald-600" />
                        <div>
                          <p>Shopkeeper (Store Owner)</p>
                          <p className="text-[10px] text-slate-400 font-normal">Live queue, inventory & quotes</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleDemoSwitch('admin')}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                        role === 'admin'
                          ? 'bg-purple-50 text-purple-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-purple-600" />
                        <div>
                          <p>Admin (Platform HQ)</p>
                          <p className="text-[10px] text-slate-400 font-normal">Verify shops, stats & categories</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* If Authenticated */}
            {isAuthenticated ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                >
                  {role === 'customer' && !(user?.profileImage || user?.profile_image) ? (
                    <span className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-black ring-2 ring-brand-500/30">
                      {user?.name?.trim()?.charAt(0)?.toUpperCase() || 'C'}
                    </span>
                  ) : (
                    <img
                      src={
                        role === 'customer'
                          ? user?.profileImage || user?.profile_image
                          : user?.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'
                      }
                      alt={user?.name}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-brand-500/30"
                    />
                  )}
                  <span className="hidden md:inline text-xs font-bold text-slate-800">
                    {user?.name?.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:inline" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-fade-in">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-800">{user?.name}</p>
                      <p className="text-[11px] text-slate-400">{user?.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-700">
                        {user?.role}
                      </span>
                    </div>

                    <div className="py-1">
                      {role === 'customer' && (
                        <Link
                          to="/customer/profile"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-brand-50 hover:text-brand-700 flex items-center gap-2"
                        >
                          <Pencil className="w-4 h-4" />
                          Edit Profile
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logout();
                          navigate('/login');
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-colors shadow-brand-500/20"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-4 px-2 border-t border-slate-100 space-y-3 bg-white animate-fade-in">
            <div className="space-y-1">
              {role === 'customer' && (
                <>
                  <Link
                    to="/customer/search"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Explore Shops & Products
                  </Link>
                  <Link
                    to="/customer/goal-planner"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-xl text-sm font-bold text-brand-600 hover:bg-brand-50"
                  >
                    ✨ AI Goal Agent
                  </Link>
                  <Link
                    to="/customer/diagnostics"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Diagnostic Search
                  </Link>
                  <Link
                    to="/customer/requests"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    My Requests
                  </Link>
                  <Link
                    to="/customer/reservations"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Product Holds
                  </Link>
                  <Link
                    to="/customer/messages"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Live Chat
                  </Link>
                </>
              )}

              {role === 'shopkeeper' && (
                <>
                  <Link
                    to="/shop/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Shopkeeper Dashboard
                  </Link>
                  <Link
                    to="/shop/products"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Inventory
                  </Link>
                  <Link
                    to="/shop/requests"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Customer Requests
                  </Link>
                  <Link
                    to="/shop/reservations"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Reservations
                  </Link>
                  <Link
                    to="/shop/messages"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Messages
                  </Link>
                </>
              )}

              {role === 'admin' && (
                <>
                  <Link
                    to="/admin/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Admin Hub
                  </Link>
                  <Link
                    to="/admin/map"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-xl text-sm font-bold text-brand-600 hover:bg-brand-50"
                  >
                    🗺️ Regional Sales Map
                  </Link>
                  <Link
                    to="/admin/users"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Users (Customers & Shopkeepers)
                  </Link>
                  <Link
                    to="/admin/shops"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Store Verification & Status
                  </Link>
                  <Link
                    to="/admin/products"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Products Catalog
                  </Link>
                  <Link
                    to="/admin/reports"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Sales & Traffic Reports
                  </Link>
                  <Link
                    to="/admin/categories"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Categories
                  </Link>
                </>
              )}

              {!isAuthenticated && (
                <Link
                  to="/customer/search"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Explore Nearby
                </Link>
              )}
            </div>

            {/* Mobile Fast Role Switcher */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3">
                1-Click Fast Role Switcher
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    handleDemoSwitch('customer');
                    setIsMobileMenuOpen(false);
                  }}
                  className="py-2 px-1 text-center rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-800 text-xs font-bold"
                >
                  Customer
                </button>
                <button
                  onClick={() => {
                    handleDemoSwitch('shopkeeper');
                    setIsMobileMenuOpen(false);
                  }}
                  className="py-2 px-1 text-center rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold"
                >
                  Shopkeeper
                </button>
                <button
                  onClick={() => {
                    handleDemoSwitch('admin');
                    setIsMobileMenuOpen(false);
                  }}
                  className="py-2 px-1 text-center rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold"
                >
                  Admin
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
