import React from 'react';
import {
  ShoppingBag,
  IndianRupee,
  Package,
  Scale,
  Send,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';

export const DashboardSummaryCards = ({
  stats = {},
  todayOrdersCount = 0,
  todaySalesAmount = 0,
  currentInventoryCount = 0,
  totalStockUnits = 0,
  activeBargainsCount = 0,
  pendingRequestsCount = 0,
  lowStockCount = 0,
  onQuickFilter,
}) => {
  const cards = [
    {
      id: 'today-orders',
      title: "Today's Orders",
      value: todayOrdersCount,
      subtitle: `${todayOrdersCount > 0 ? `${todayOrdersCount} pickup holds today` : 'Ready for orders'}`,
      icon: ShoppingBag,
      iconBg: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
      badge: 'Live',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      accentBorder: 'hover:border-emerald-300',
    },
    {
      id: 'today-sales',
      title: "Today's Sales",
      value: `₹${todaySalesAmount.toLocaleString('en-IN')}`,
      subtitle: 'Counter & reservation GMV',
      icon: IndianRupee,
      iconBg: 'bg-blue-500/10 text-blue-600 border border-blue-500/20',
      badge: '+18% vs avg',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      accentBorder: 'hover:border-blue-300',
    },
    {
      id: 'current-inventory',
      title: 'Current Inventory',
      value: currentInventoryCount,
      subtitle: `${totalStockUnits} total units in stock`,
      icon: Package,
      iconBg: 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20',
      badge: 'Catalog',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      accentBorder: 'hover:border-indigo-300',
    },
    {
      id: 'active-bargains',
      title: 'Active Bargains',
      value: activeBargainsCount,
      subtitle: 'Live counter-offer negotiations',
      icon: Scale,
      iconBg: 'bg-gradient-to-br from-amber-400 to-yellow-600 text-white shadow-sm shadow-amber-500/30',
      badge: '⚖️ Live',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300 font-black',
      accentBorder: 'hover:border-amber-400 ring-1 ring-amber-400/30',
      highlight: true,
    },
    {
      id: 'pending-requests',
      title: 'Customer Requests',
      value: pendingRequestsCount,
      subtitle: `${pendingRequestsCount} awaiting quote or bargain`,
      icon: Send,
      iconBg: 'bg-purple-500/10 text-purple-600 border border-purple-500/20',
      badge: pendingRequestsCount > 0 ? 'Action Req' : 'Clear',
      badgeColor: pendingRequestsCount > 0 ? 'bg-purple-50 text-purple-700 border-purple-200 animate-pulse' : 'bg-slate-100 text-slate-600',
      accentBorder: 'hover:border-purple-300',
    },
    {
      id: 'low-stock',
      title: 'Low Stock Products',
      value: lowStockCount,
      subtitle: lowStockCount > 0 ? 'Needs reorder replenishment' : 'Stock levels healthy',
      icon: AlertTriangle,
      iconBg: lowStockCount > 0 ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20' : 'bg-slate-100 text-slate-500',
      badge: lowStockCount > 0 ? 'Critical' : 'Healthy',
      badgeColor: lowStockCount > 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
      accentBorder: lowStockCount > 0 ? 'hover:border-rose-300' : 'hover:border-slate-300',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-500">
            Real-Time Store Performance & Intelligence
          </h2>
        </div>
        <span className="text-xs text-slate-400 font-medium hidden sm:inline">
          Auto-synchronized with counter sales
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.id}
              onClick={() => onQuickFilter && onQuickFilter(c.id)}
              className={`bg-white rounded-2xl p-4 border border-slate-200 shadow-sm transition-all duration-200 cursor-pointer flex flex-col justify-between hover:shadow-md ${c.accentBorder} ${
                c.highlight ? 'bg-gradient-to-br from-amber-50/40 via-white to-yellow-50/30' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold ${c.iconBg}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${c.badgeColor}`}>
                  {c.badge}
                </span>
              </div>

              <div className="mt-3">
                <span className="text-xs font-bold text-slate-500 tracking-wide block">
                  {c.title}
                </span>
                <div className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                  {c.value}
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-1 truncate">
                  {c.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
