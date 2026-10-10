import React, { useState } from 'react';
import { IndianRupee, TrendingUp, ArrowDownRight, Wallet, CheckCircle2, Landmark, RefreshCw, CreditCard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

export const ShopPaymentsPage = () => {
  const { user } = useAuth();
  const { addToast } = useNotification();
  const [payoutRequested, setPayoutRequested] = useState(false);

  const [earnings] = useState({
    totalSales: 48500,
    onlinePayoutsPending: 12400,
    cashOnCounterCompleted: 36100,
    settledToBank: 32000,
  });

  const [ledger] = useState([
    {
      id: 'led_99182',
      date: 'Today, 03:10 PM',
      customer: 'Rohan Sharma',
      product: 'Bosch Impact Drill Kit (1 unit)',
      amount: 2850,
      paymentMode: 'Online UPI (Direct Settlement)',
      status: 'SETTLED',
    },
    {
      id: 'led_99140',
      date: 'Today, 01:25 PM',
      customer: 'Priya Verma',
      product: 'Astral CPVC Pro Pipe 1 inch (3 Meter)',
      amount: 780,
      paymentMode: 'Cash on Counter Pickup',
      status: 'RECEIVED',
    },
    {
      id: 'led_98801',
      date: 'Yesterday, 07:40 PM',
      customer: 'Amit Patel',
      product: 'Finolex 1-inch Heavy Duty PVC Pipe (10ft)',
      amount: 1450,
      paymentMode: 'Online UPI (QuickKart Escrow)',
      status: 'PENDING_PAYOUT',
    },
  ]);

  const handleRequestPayout = () => {
    setPayoutRequested(true);
    addToast('🏦 Payout Request of ₹12,400 submitted! Transfer to HDFC Bank (A/C **4819) initiated.', 'success', 6000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-600 font-bold text-xs uppercase tracking-wider mb-1">
            <IndianRupee className="w-3.5 h-3.5" />
            <span>Store Financial Ledger & Payouts</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            Shop Sales, Earnings & Payout Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track daily counter collections, online customer UPI payments, and request bank payouts.
          </p>
        </div>

        <button
          onClick={handleRequestPayout}
          disabled={payoutRequested}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-2 transition-all"
        >
          <Landmark className="w-4 h-4" />
          {payoutRequested ? 'Payout Requested' : 'Withdraw Earnings to Bank'}
        </button>
      </div>

      {/* Earnings Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-3xl shadow-lg border border-slate-700 space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Sales Volume</span>
          <div className="text-3xl font-black text-white">₹{earnings.totalSales.toLocaleString('en-IN')}</div>
          <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> +18.4% growth this week
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Bank Payout</span>
          <div className="text-2xl font-black text-amber-600">₹{earnings.onlinePayoutsPending.toLocaleString('en-IN')}</div>
          <p className="text-xs text-slate-500">Ready for instant withdrawal</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cash Collected at Counter</span>
          <div className="text-2xl font-black text-slate-800">₹{earnings.cashOnCounterCompleted.toLocaleString('en-IN')}</div>
          <p className="text-xs text-slate-500">Direct cash in register</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Settled to Bank A/C</span>
          <div className="text-2xl font-black text-emerald-600">₹{earnings.settledToBank.toLocaleString('en-IN')}</div>
          <p className="text-xs text-slate-500">HDFC Bank A/C ending in 4819</p>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="text-base font-black text-slate-900">Live Sales Transaction Ledger</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Transaction / Item</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Payout Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ledger.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-900 block">{entry.product}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{entry.date} • ID: {entry.id}</span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700">{entry.customer}</td>
                  <td className="py-3.5 px-4 font-medium text-slate-600">{entry.paymentMode}</td>
                  <td className="py-3.5 px-4 font-black text-slate-900">₹{entry.amount}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase ${
                        entry.status === 'SETTLED' || entry.status === 'RECEIVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {entry.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
