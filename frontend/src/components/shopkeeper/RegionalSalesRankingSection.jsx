import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  MapPin,
  Calendar,
  Award,
  Flame,
  AlertTriangle,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  ArrowUpRight,
  Package,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { shopService } from '../../services/shopService';

export const RegionalSalesRankingSection = ({ shopId }) => {
  const [range, setRange] = useState('10'); // '1' | '5' | '10' | '25' | '50' | '100'
  const [period, setPeriod] = useState('30d'); // 'today' | '7d' | '30d' | '90d' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [rankingData, setRankingData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRankings = async () => {
    setLoading(true);
    try {
      const res = await shopService.getRegionalRanking({
        range,
        period,
        startDate: period === 'custom' ? startDate : undefined,
        endDate: period === 'custom' ? endDate : undefined,
        shopId,
      });

      if (res.success) {
        setRankingData(res);
      }
    } catch (err) {
      console.error('Error fetching regional sales rankings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();
  }, [range, period, startDate, endDate]);

  const ranges = [
    { label: '1 km', value: '1' },
    { label: '5 km', value: '5' },
    { label: '10 km', value: '10' },
    { label: '25 km', value: '25' },
    { label: '50 km', value: '50' },
    { label: '100 km', value: '100' },
  ];

  const periods = [
    { label: 'Today', value: 'today' },
    { label: '7 Days', value: '7d' },
    { label: '30 Days', value: '30d' },
    { label: '90 Days', value: '90d' },
    { label: 'Custom', value: 'custom' },
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-600 font-bold text-xs uppercase tracking-wider mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Hyperlocal Market Analytics & Demand Benchmarking</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Regional Sales Ranking & Demand Intelligence
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dynamically ranks top-selling products in your local catchment area and contrasts regional sales against your store's performance.
          </p>
        </div>

        <button
          onClick={fetchRankings}
          className="self-start lg:self-center p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold flex items-center gap-1.5 transition-colors"
          title="Recalculate rankings"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Recalculate</span>
        </button>
      </div>

      {/* Range & Period Selectors */}
      <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Geographical Range Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-brand-600" />
            <span>Geographical Range (Radius):</span>
          </label>
          <div className="flex flex-wrap bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold shadow-inner">
            {ranges.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  range === r.value
                    ? 'bg-slate-900 text-white shadow-sm font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Time Period Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-brand-600" />
            <span>Time Period:</span>
          </label>
          <div className="flex flex-wrap bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold shadow-inner">
            {periods.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  period === p.value
                    ? 'bg-brand-600 text-white shadow-sm font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Date Pickers if period === 'custom' */}
      {period === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-brand-50/50 rounded-xl border border-brand-200 text-xs">
          <span className="font-bold text-brand-800">Custom Date Interval:</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Summary Metrics Bar */}
      {rankingData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white p-4 rounded-2xl shadow-sm">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Radius & Horizon</span>
            <span className="text-sm font-black text-amber-400">
              {range} km • {period.toUpperCase()}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Verified Stores</span>
            <span className="text-sm font-black text-white">
              {rankingData.shopsInRangeCount} stores in radius
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Regional Units Sold</span>
            <span className="text-sm font-black text-emerald-400">
              {rankingData.totalRegionalUnits?.toLocaleString('en-IN')} units
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Regional Sales</span>
            <span className="text-sm font-black text-white">
              ₹{rankingData.totalRegionalRevenue?.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      )}

      {/* Feature 5: High-Demand Opportunity Advisory Callout */}
      {rankingData?.highDemandOpportunities?.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-transparent border-l-4 border-amber-500 p-4 rounded-r-2xl space-y-1.5">
          <div className="flex items-center gap-2 text-amber-900 font-black text-xs uppercase tracking-wider">
            <Flame className="w-4 h-4 text-amber-600" />
            <span>High Regional Demand & Restock Opportunity</span>
          </div>
          <p className="text-xs text-slate-700 font-medium">
            {rankingData.highDemandOpportunities[0].recommendation}
          </p>
        </div>
      )}

      {/* Rankings List / Table */}
      {loading ? (
        <div className="text-center py-16 space-y-2">
          <RefreshCw className="w-6 h-6 text-brand-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">
            Aggregating geospatial order logs for {range} km radius...
          </p>
        </div>
      ) : rankingData?.rankings?.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl space-y-2">
          <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-700">No order logs found for this exact range and timeframe</p>
          <p className="text-[11px] text-slate-400">Try expanding your geographical range to 25 km or select Last 30 Days</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/50">
                <th className="py-3 px-3 text-center w-12">Rank</th>
                <th className="py-3 px-4">Product Name & Category</th>
                <th className="py-3 px-4 text-right">Regional Sales</th>
                <th className="py-3 px-4 text-right">My Shop Sales</th>
                <th className="py-3 px-4 text-center">My Stock Level</th>
                <th className="py-3 px-4">Market Intelligence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {rankingData?.rankings?.map((item) => {
                const isTop3 = item.rank <= 3;
                const isLowStock = item.myShopStock <= item.lowStockThreshold;
                const isOutOfStock = item.myShopStock === 0;

                return (
                  <tr
                    key={item.productName}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      item.rank === 1 ? 'bg-amber-50/20' : ''
                    }`}
                  >
                    {/* Rank Badge */}
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black shadow-sm ${
                          item.rank === 1
                            ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 font-black ring-2 ring-amber-300'
                            : item.rank === 2
                            ? 'bg-slate-200 text-slate-800 ring-1 ring-slate-300'
                            : item.rank === 3
                            ? 'bg-amber-700/20 text-amber-900 ring-1 ring-amber-700/30'
                            : 'bg-slate-100 text-slate-600 font-bold'
                        }`}
                      >
                        {item.rank}
                      </span>
                    </td>

                    {/* Product Name & Visual */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.image}
                          alt={item.productName}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                          loading="lazy"
                        />
                        <div>
                          <h4 className="font-black text-slate-900 leading-snug">
                            {item.productName}
                          </h4>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {item.category} • ₹{item.price} / {item.unit}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Regional Units Sold */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-sm font-black text-slate-900">
                        {item.totalQuantitySold} sold
                      </span>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        {item.regionalSharePct}% regional share
                      </span>
                    </td>

                    {/* My Shop Sales */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-sm font-black text-brand-600">
                        {item.myShopQuantitySold} sold
                      </span>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        in your store
                      </span>
                    </td>

                    {/* My Shop Stock */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full border ${
                          isOutOfStock
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : isLowStock
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isOutOfStock
                              ? 'bg-red-500'
                              : isLowStock
                              ? 'bg-amber-500 animate-pulse'
                              : 'bg-emerald-500'
                          }`}
                        />
                        {item.myShopStock} in stock
                      </span>
                    </td>

                    {/* Market Intelligence Indicators */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.indicators?.map((ind, idx) => (
                          <span
                            key={idx}
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full border shadow-sm ${ind.color}`}
                          >
                            {ind.label}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
