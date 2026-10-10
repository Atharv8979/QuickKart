import React, { useState } from 'react';
import { Truck, MapPin, User, Phone, CheckCircle2, Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const CustomerDeliveriesPage = () => {
  const { user } = useAuth();
  const [deliveries] = useState([
    {
      id: 'del_8801',
      shopName: 'Sharma Hardware & Sanitation Store',
      items: 'Finolex 1-inch Heavy Duty PVC Pipe (2x)',
      totalAmount: 580,
      deliveryFee: 30,
      status: 'ON THE WAY',
      agentName: 'Ramesh Agent (QuickKart Partner)',
      agentPhone: '+91 97110 09922',
      eta: '10 mins',
      address: 'House 42, Block 8, Ajmal Khan Road, Karol Bagh',
    },
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Truck className="w-3.5 h-3.5" />
            <span>Agent Delivery Tracking</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            My Delivery Orders & Agent Tracking
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track live agent deliveries dispatched directly from neighborhood stores to your doorstep.
          </p>
        </div>
      </div>

      {/* Deliveries */}
      <div className="space-y-4">
        {deliveries.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
            <Truck className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No active delivery orders</h3>
            <p className="text-xs text-slate-500">When you request agent delivery on a hold ticket or broadcast order, tracking details will appear here.</p>
          </div>
        ) : (
          deliveries.map((del) => (
            <div key={del.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[11px] font-bold text-brand-600 uppercase tracking-wider">Store Delivery</span>
                  <h3 className="text-lg font-black text-slate-900">{del.shopName}</h3>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 self-start sm:self-auto">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{del.status} • ETA ~{del.eta}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                  <span className="font-bold text-slate-800 block">Delivery Address:</span>
                  <p className="flex items-start gap-1.5 text-slate-600">
                    <MapPin className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
                    <span>{del.address}</span>
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                  <span className="font-bold text-slate-800 block">Agent Info:</span>
                  <p className="font-bold text-slate-900">{del.agentName}</p>
                  <a
                    href={`tel:${del.agentPhone}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:underline"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call Agent ({del.agentPhone})
                  </a>
                </div>
              </div>

              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Total Price: ₹{del.totalAmount} + Agent Fee ₹{del.deliveryFee}</span>
                <span className="font-bold text-emerald-800">Pay Agent on Arrival (Cash / UPI)</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
