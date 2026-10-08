import React, { useState } from 'react';
import { useNotification } from '../../context/NotificationContext';
import { Camera, Sparkles, AlertCircle, Clock, Check, TrendingDown } from 'lucide-react';

export const ShelfIntelligenceCard = () => {
  const { addToast } = useNotification();
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState({
    detectedTotal: 20,
    batches: [
      {
        count: 6,
        label: 'Expire TOMORROW',
        action: 'Sell First • ₹10 discount applied automatically',
        color: 'border-rose-500 bg-rose-500/10 text-rose-300',
        badge: 'bg-rose-500 text-white',
        discount: 25,
      },
      {
        count: 8,
        label: 'Expire in 4 days',
        action: 'Surface higher in search ranking',
        color: 'border-amber-500 bg-amber-500/10 text-amber-300',
        badge: 'bg-amber-500 text-white',
        discount: 10,
      },
      {
        count: 6,
        label: 'Expire in 12 days',
        action: 'Normal listing, no action needed',
        color: 'border-emerald-500 bg-emerald-500/10 text-emerald-300',
        badge: 'bg-emerald-500 text-white',
        discount: 0,
      },
    ],
  });

  const handleRunScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      addToast('📸 Shelf Scanner: 20 items analyzed with computer vision & OCR timestamps!', 'success');
    }, 1200);
  };

  const handleApplyDiscounts = () => {
    addToast('🏷️ Dynamic Near-Expiry Discounts published to nearby customers!', 'success');
  };

  return (
    <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">
              Chapter 16.3 • Computer-Vision Shelf & Expiry Intelligence (Fig 16.3)
            </span>
          </div>
          <h3 className="text-xl font-black text-white mt-0.5">
            Predictive Perishable Inventory Intelligence
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunScan}
            disabled={scanning}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5"
          >
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            {scanning ? 'Scanning Shelf...' : 'Simulate Shelf CV Scan'}
          </button>
          <button
            onClick={handleApplyDiscounts}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Publish Auto-Discounts
          </button>
        </div>
      </div>

      {/* 3 Batches Breakdown matching Fig 16.3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scanResult.batches.map((batch, index) => (
          <div
            key={index}
            className={`p-5 rounded-2xl border-2 flex flex-col justify-between space-y-3 ${batch.color}`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${batch.badge}`}>
                {batch.count} Items
              </span>
              {batch.discount > 0 && (
                <span className="text-xs font-bold text-white bg-slate-800/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <TrendingDown className="w-3 h-3 text-amber-400" />
                  -{batch.discount}% Auto Deal
                </span>
              )}
            </div>

            <div className="py-2">
              <h4 className="text-lg font-black text-white">{batch.label}</h4>
              <p className="text-xs text-slate-300 mt-1 leading-snug">{batch.action}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
