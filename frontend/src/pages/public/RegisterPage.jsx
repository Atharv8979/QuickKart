import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { User, Store, Mail, Lock, Phone, MapPin, Navigation, Building2, Tag } from 'lucide-react';
import { SHOP_TAGS } from '../../utils/shopRules';
import { getCurrentPositionAddress } from '../../utils/geoUtils';

export const RegisterPage = () => {
  const { register } = useAuth();
  const { addToast } = useNotification();
  const navigate = useNavigate();

  const [role, setRole] = useState('customer'); // 'customer' | 'shopkeeper'

  // Shared account fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Address — typed manually or filled via GPS ("current location")
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('India');
  const [coords, setCoords] = useState(null); // { lat, lng }
  const [locating, setLocating] = useState(false);

  // Shopkeeper-only fields
  const [shopName, setShopName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);

  const [loading, setLoading] = useState(false);

  const toggleTag = (tag) =>
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  // "Use current location" — reverse-geocodes the GPS fix into the address
  // fields above (Google Maps / OSM data), so "Get Direction" later resolves.
  const handleUseLocation = async () => {
    setLocating(true);
    try {
      const pos = await getCurrentPositionAddress();
      setCoords({ lat: pos.lat, lng: pos.lng });
      if (pos.street) setStreet((prev) => prev || pos.street);
      if (pos.city) setCity(pos.city);
      if (pos.state) setState(pos.state);
      if (pos.pincode) setZip((prev) => prev || pos.pincode);
      if (pos.country) setCountry(pos.country);
      addToast('Current location detected', 'success');
    } catch (err) {
      addToast(
        'Could not read your location — please type the address instead.',
        'error'
      );
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!firstName || !email || !password) {
      addToast('Please fill in all required fields', 'error');
      return;
    }
    if (!street) {
      addToast('Please provide your address (or use current location)', 'error');
      return;
    }
    if (role === 'shopkeeper') {
      if (!shopName) {
        addToast('Please enter your shop / business name', 'error');
        return;
      }
      if (selectedTags.length === 0) {
        addToast('Please select at least one shop tag', 'error');
        return;
      }
    }

    setLoading(true);
    try {
      const res = await register({
        firstName,
        lastName,
        name: [firstName, lastName].filter(Boolean).join(' '),
        email,
        phone,
        password,
        role,
        address: { street, city, state, pincode: zip, country },
        city,
        state,
        zip,
        country,
        // Shopkeeper extras (ignored for customers by the backend)
        shopName,
        gstNumber,
        tags: selectedTags,
        location: coords,
      });

      if (res?.success) {
        addToast(
          role === 'shopkeeper'
            ? 'Shop account created — welcome!'
            : 'Account created!',
          'success'
        );
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Ramesh"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Sharma"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
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

          {/* Shopkeeper-only: business details */}
          {role === 'shopkeeper' && (
            <div className="space-y-4 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px] uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5" />
                <span>Business Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Shop / Business Name *
                  </label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. Sharma Hardware Store"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    GST Number
                  </label>
                  <input
                    type="text"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. 07AAAAA0000A1Z5"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Mobile Phone Number *
                </label>
                <input
                  type="tel"
                  required={role === 'shopkeeper'}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Shop tags — drive keyword restrictions on listings */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  <span className="inline-flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Shop Tags * (pick all that apply)
                  </span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SHOP_TAGS.map((tag) => {
                    const active = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 rounded-full border text-[11px] font-bold transition-all ${
                          active
                            ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm'
                            : 'border-slate-300 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Tags control which items you can list — e.g. hardware shops can&apos;t add groceries like aata or refined oil.
                </p>
              </div>
            </div>
          )}

          {/* Address — manual entry or one-tap "current location" (GPS).
              The saved address feeds Google Maps "Get Direction" everywhere. */}
          <div className="space-y-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-brand-700 font-bold text-[11px] uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5" />
                <span>Address</span>
              </div>
              <button
                type="button"
                onClick={handleUseLocation}
                disabled={locating}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-300 bg-brand-50 text-brand-700 text-[11px] font-bold hover:bg-brand-100 transition-all disabled:opacity-60"
              >
                <Navigation className={`w-3 h-3 ${locating ? 'animate-pulse' : ''}`} />
                {locating ? 'Locating...' : 'Use Current Location'}
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Street / Area *
              </label>
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="e.g. Shop 14, Block 8, Ajmal Khan Road"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="New Delhi"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Delhi"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  ZIP / Postal Code
                </label>
                <input
                  type="text"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="110005"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
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
