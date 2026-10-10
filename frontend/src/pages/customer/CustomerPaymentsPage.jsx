import React, { useState } from 'react';
import { CreditCard, Wallet, ArrowUpRight, ArrowDownLeft, ShieldCheck, CheckCircle2, Clock, Smartphone, Landmark } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

export const CustomerPaymentsPage = () => {
  const { user } = useAuth();
  const { addToast } = useNotification();
  const [activeTab, setActiveTab] = useState('transactions');
  const [selectedMethod, setSelectedMethod] = useState('upi');

  const [transactions] = useState([
    {
      id: 'tx_109283',
      date: 'Today, 02:45 PM',
      shopName: 'Sharma Hardware & Sanitation Store',
      item: 'Finolex 1-inch Heavy Duty PVC Pipe (10ft)',
      amount: 580,
      type: 'Online UPI (GPay)',
      status: 'SUCCESS',
      reference: 'UPI/4092817263/QK',
    },
    {
      id: 'tx_109255',
      date: 'Yesterday, 06:15 PM',
      shopName: 'City Plumbing & Daily Goods',
      item: 'Astral CPVC Pro Pipe 1 inch',
      amount: 390,
      type: 'Cash on Counter / Delivery',
      status: 'COMPLETED',
      reference: 'COD/QK-8421',
    },
    {
      id: 'tx_108842',
      date: '08 Oct 2026, 11:30 AM',
      shopName: 'Ashta Civil Medical Store',
      item: 'Paracetamol 650 & First Aid Kit',
      amount: 180,
      type: 'Online UPI (PhonePe)',
      status: 'SUCCESS',
      reference: 'UPI/3829104829/QK',
    },
  ]);

  const handleAddFunds = () => {
    addToast('💳 UPI Payment Gateway opened. ₹500 added to QuickKart Wallet!', 'success');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-600 font-bold text-xs uppercase tracking-wider mb-1">
            <CreditCard className="w-3.5 h-3.5" />
            <span>Customer Payments & Wallet Ledger</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            My Payments & Transaction History
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage online payments (UPI, Cards), Cash on Delivery preferences, and inspect verified receipts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAddFunds}
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 flex items-center gap-2 transition-all"
          >
            <Wallet className="w-4 h-4" />
            Add Wallet Cash
          </button>
        </div>
      </div>

      {/* Wallet Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-3xl shadow-lg border border-slate-700 relative overflow-hidden space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">QuickKart Wallet</span>
            <Wallet className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <span className="text-3xl font-black text-white">₹1,250.00</span>
            <p className="text-[11px] text-emerald-400 font-semibold mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Ready for 1-tap instant counter checkout
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preferred Payment Mode</span>
            <Smartphone className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <span className="text-lg font-black text-slate-900">UPI / GPay / PhonePe</span>
            <p className="text-xs text-slate-500 mt-1">Instant payment link issued upon shop acceptance</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cash on Delivery / Counter</span>
            <Landmark className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <span className="text-lg font-black text-emerald-700">Enabled</span>
            <p className="text-xs text-slate-500 mt-1">Pay physical cash after inspecting product</p>
          </div>
        </div>
      </div>

      {/* Payment History Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="text-base font-black text-slate-900">Transaction History</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Transaction Details</th>
                <th className="py-3 px-4">Store</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-900 block">{tx.item}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{tx.date} • {tx.reference}</span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700">{tx.shopName}</td>
                  <td className="py-3.5 px-4 font-medium text-slate-600">{tx.type}</td>
                  <td className="py-3.5 px-4 font-black text-slate-900">₹{tx.amount}</td>
                  <td className="py-3.5 px-4">
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                      {tx.status}
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
