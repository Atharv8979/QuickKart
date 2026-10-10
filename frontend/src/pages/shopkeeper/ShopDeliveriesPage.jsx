import React, { useState } from 'react';
import { Truck, MapPin, User, Phone, CheckCircle2, Clock, Plus, IndianRupee, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

export const ShopDeliveriesPage = () => {
  const { user } = useAuth();
  const { addToast } = useNotification();
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  const [agentFee, setAgentFee] = useState(30);

  const [deliveries, setDeliveries] = useState([
    {
      id: 'del_8801',
      customerName: 'Aakash Sharma',
      customerPhone: '+91 98112 34567',
      address: 'House 42, Block 8, Ajmal Khan Road, Karol Bagh',
      items: 'Finolex 1-inch Heavy Duty PVC Pipe (2x)',
      totalAmount: 580,
      deliveryFee: 30,
      status: 'AGENT_ASSIGNED',
      agentName: 'Ramesh Agent (QuickKart Partner)',
      agentPhone: '+91 97110 09922',
      eta: '12 mins',
    },
    {
      id: 'del_8802',
      customerName: 'Meena Kapoor',
      customerPhone: '+91 98991 22334',
      address: 'Plot 14, Pusa Road, Karol Bagh',
      items: 'Bosch Impact Drill Kit (1x)',
      totalAmount: 2850,
      deliveryFee: 50,
      status: 'OUT_FOR_DELIVERY',
      agentName: 'Sanjay Kumar (Agent)',
      agentPhone: '+91 98100 44556',
      eta: '5 mins',
    },
  ]);

  const handleUpdateDeliveryFee = () => {
    addToast(`🚚 Agent Delivery Fee updated to ₹${agentFee}! Applied to new delivery orders.`, 'success');
  };

  const handleDispatchAgent = (deliveryId) => {
    setDeliveries((prev) =>
      prev.map((d) => (d.id === deliveryId ? { ...d, status: 'DISPATCHED' } : d))
    );
    addToast(`🚀 Delivery Agent dispatched for order #${deliveryId}! Customer notified.`, 'success');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Truck className="w-3.5 h-3.5" />
            <span>Local Agent Delivery & Dispatch</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            Agent Delivery & Dispatch Manager
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure agent delivery fees, dispatch local delivery agents, and track live drop-offs.
          </p>
        </div>

        {/* Delivery Fee Settings */}
        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
          <div className="text-xs">
            <span className="text-slate-500 block font-semibold">Agent Delivery Fee:</span>
            <div className="flex items-center gap-1 mt-1">
              <span className="font-black text-slate-800">₹</span>
              <input
                type="number"
                value={agentFee}
                onChange={(e) => setAgentFee(Number(e.target.value))}
                className="w-16 px-2 py-1 border border-slate-300 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              />
            </div>
          </div>

          <button
            onClick={handleUpdateDeliveryFee}
            className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm transition-all"
          >
            Save Fee
          </button>
        </div>
      </div>

      {/* Deliveries Grid */}
      <div className="space-y-4">
        <h3 className="text-base font-black text-slate-900">Active Delivery Orders ({deliveries.length})</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {deliveries.map((del) => (
            <div key={del.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                    #{del.id}
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm mt-1">{del.customerName}</h4>
                </div>

                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase">
                  {del.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <p className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-brand-600 flex-shrink-0" />
                  <span>{del.address}</span>
                </p>
                <p className="flex items-center gap-2 font-bold text-slate-800">
                  <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span>Items: {del.items}</span>
                </p>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between font-bold">
                  <span>Product Amount: ₹{del.totalAmount}</span>
                  <span className="text-brand-600">+ Agent Fee: ₹{del.deliveryFee}</span>
                </div>
              </div>

              {/* Agent info */}
              <div className="bg-brand-50/60 p-3 rounded-xl border border-brand-100 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-brand-900 block">{del.agentName}</span>
                  <span className="text-[11px] text-brand-700">{del.agentPhone} • ETA ~{del.eta}</span>
                </div>
                <button
                  onClick={() => handleDispatchAgent(del.id)}
                  disabled={del.status === 'DISPATCHED'}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-xs"
                >
                  {del.status === 'DISPATCHED' ? 'Dispatched' : 'Dispatch Now'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
