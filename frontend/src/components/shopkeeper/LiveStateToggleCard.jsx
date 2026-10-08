import React, { useState } from 'react';
import { shopService } from '../../services/shopService';
import { useNotification } from '../../context/NotificationContext';
import { Radio, Users, Clock, Zap, Check, ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react';

export const LiveStateToggleCard = ({ shop, onUpdate }) => {
  const { addToast } = useNotification();
  const [currentlyServing, setCurrentlyServing] = useState(shop?.liveState?.currentlyServing ?? 2);
  const [queueTime, setQueueTime] = useState(shop?.liveState?.queueTimeMinutes ?? 5);
  const [isOpenNow, setIsOpenNow] = useState(shop?.openingHours?.isOpenNow ?? true);
  const [isAccepting, setIsAccepting] = useState(shop?.isAcceptingRequests ?? true);
  const [saving, setSaving] = useState(false);

  const handleSaveState = async () => {
    setSaving(true);
    try {
      const res = await shopService.updateMyShop({
        isAcceptingRequests: isAccepting,
        openingHours: {
          isOpenNow,
        },
        liveState: {
          currentlyServing,
          queueTimeMinutes: queueTime,
          responseRatePercent: shop?.liveState?.responseRatePercent || 98,
          lastActiveMinutesAgo: 1,
          isAvailableNow: isOpenNow,
        },
      });

      if (res.success) {
        addToast('⚡ Live Business Capability updated! Customers see your updated queue & status.', 'success');
        if (onUpdate) onUpdate(res.shop);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update live state', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-navy-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-400 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-brand-400">
                QuickKart Live Business Engine (Fig 16.4)
              </span>
            </div>
            <h3 className="text-xl font-black text-white mt-0.5">
              Live Store Capability & Queue State
            </h3>
          </div>

          <button
            onClick={handleSaveState}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/30 transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Check className="w-4 h-4" />
            {saving ? 'Syncing...' : 'Publish Live State'}
          </button>
        </div>

        {/* Real-time Toggles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Open / Closed Status */}
          <div className="bg-slate-800/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-700/60 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-semibold block mb-1">
              Storefront Status
            </span>
            <div className="flex items-center justify-between mt-2">
              <span
                className={`text-sm font-bold flex items-center gap-1.5 ${
                  isOpenNow ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isOpenNow ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                  }`}
                />
                {isOpenNow ? 'Open to Customers' : 'Closed'}
              </span>
              <button
                type="button"
                onClick={() => setIsOpenNow(!isOpenNow)}
                className="text-slate-300 hover:text-white"
              >
                {isOpenNow ? (
                  <ToggleRight className="w-8 h-8 text-emerald-400" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-500" />
                )}
              </button>
            </div>
          </div>

          {/* 2. Customer Queue Count */}
          <div className="bg-slate-800/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-700/60">
            <span className="text-xs text-slate-400 font-semibold block mb-1">
              Customers Currently at Shop
            </span>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-400" />
                <span className="text-xl font-black text-white">{currentlyServing}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentlyServing(Math.max(0, currentlyServing - 1))}
                  className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 font-bold text-xs text-white"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentlyServing(currentlyServing + 1)}
                  className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 font-bold text-xs text-white"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* 3. Est. Queue Waiting Time */}
          <div className="bg-slate-800/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-700/60">
            <span className="text-xs text-slate-400 font-semibold block mb-1">
              Estimated In-Store Wait
            </span>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <span className="text-xl font-black text-white">~{queueTime} min</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setQueueTime(Math.max(1, queueTime - 2))}
                  className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 font-bold text-xs text-white"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => setQueueTime(queueTime + 2)}
                  className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 font-bold text-xs text-white"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* 4. Accept Broadcast Inquiries */}
          <div className="bg-slate-800/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-700/60 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-semibold block mb-1">
              Broadcast Inquiries
            </span>
            <div className="flex items-center justify-between mt-2">
              <span
                className={`text-xs font-bold ${
                  isAccepting ? 'text-brand-400' : 'text-slate-500'
                }`}
              >
                {isAccepting ? '⚡ Accepting Pings' : 'Paused'}
              </span>
              <button
                type="button"
                onClick={() => setIsAccepting(!isAccepting)}
                className="text-slate-300 hover:text-white"
              >
                {isAccepting ? (
                  <ToggleRight className="w-8 h-8 text-brand-400" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-500" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
