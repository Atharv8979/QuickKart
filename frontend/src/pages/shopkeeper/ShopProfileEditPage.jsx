import React, { useState, useEffect } from 'react';
import { shopService } from '../../services/shopService';
import { useNotification } from '../../context/NotificationContext';
import { Store, MapPin, Clock, Phone, Mail, Save, RefreshCw } from 'lucide-react';

export const ShopProfileEditPage = () => {
  const { addToast } = useNotification();
  const [shop, setShop] = useState(null);
  const [shopName, setShopName] = useState('');
  const [tagline, setTagline] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [openTime, setOpenTime] = useState('09:00 AM');
  const [closeTime, setCloseTime] = useState('09:00 PM');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShop = async () => {
      setLoading(true);
      try {
        const res = await shopService.getMyShop();
        if (res.success) {
          const s = res.shop;
          setShop(s);
          setShopName(s.shopName || '');
          setTagline(s.tagline || '');
          setCategory(s.category || '');
          setDescription(s.description || '');
          setPhone(s.contactPhone || '');
          setStreet(s.address?.street || '');
          setArea(s.address?.area || '');
          setCity(s.address?.city || '');
          setPincode(s.address?.pincode || '');
          setOpenTime(s.openingHours?.open || '09:00 AM');
          setCloseTime(s.openingHours?.close || '09:00 PM');
        }
      } catch (err) {
        console.error('Error fetching shop:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchShop();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await shopService.updateMyShop({
        shopName,
        tagline,
        category,
        description,
        contactPhone: phone,
        address: { street, area, city, pincode },
        openingHours: { open: openTime, close: closeTime },
      });
      if (res.success) {
        addToast('Store profile & business details updated!', 'success');
      }
    } catch (err) {
      addToast('Failed to update shop profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-24 space-y-2">
        <RefreshCw className="w-6 h-6 text-brand-600 animate-spin mx-auto" />
        <p className="text-xs text-slate-500">Loading store settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-brand-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Store className="w-3.5 h-3.5" />
            <span>Merchant Profile Settings</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            Store Profile & Operating Details
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure your storefront title, trade category, physical address, and hours.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Store Name *
            </label>
            <input
              type="text"
              required
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 font-bold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Tagline
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Authorized Finolex & Astral Dealer"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Trade Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Store Description
            </label>
            <textarea
              rows="3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            ></textarea>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Operating Hours
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                  placeholder="08:30 AM"
                  className="w-1/2 px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
                <input
                  type="text"
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  placeholder="09:00 PM"
                  className="w-1/2 px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Physical Storefront Address
            </h4>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Street & Shop No.</label>
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Area / Market</label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">PIN Code</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/25 transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Updating Store Details...' : 'Update Store Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};
