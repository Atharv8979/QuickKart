import React, { useMemo, useState } from 'react';
import { useCompare } from './CompareContext';
import { analyzeOffers, formatMoney, formatDistance } from './compareUtils';
import { Badge } from '../common/Badge';
import {
  Scale,
  X,
  Trash2,
  Star,
  Truck,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShoppingBag,
  ArrowLeft,
  Award,
  Sparkles,
} from 'lucide-react';

const REC_KEYS = ['bestValue', 'lowestPrice', 'bestRated', 'bestAvailability'];
const FLAG_BY_KEY = {
  bestValue: 'isBestValue',
  lowestPrice: 'isLowestPrice',
  bestRated: 'isBestRated',
  bestAvailability: 'isBestAvailability',
};

const REC_META = {
  bestValue: { icon: Award, pill: 'bg-emerald-100 text-emerald-800 border-emerald-300', strip: 'border-emerald-200 bg-emerald-50 text-emerald-900' },
  lowestPrice: { icon: Sparkles, pill: 'bg-brand-50 text-brand-800 border-brand-200', strip: 'border-brand-200 bg-brand-50 text-brand-900' },
  bestRated: { icon: Star, pill: 'bg-amber-100 text-amber-800 border-amber-300', strip: 'border-amber-200 bg-amber-50 text-amber-900' },
  bestAvailability: { icon: CheckCircle2, pill: 'bg-sky-100 text-sky-800 border-sky-300', strip: 'border-sky-200 bg-sky-50 text-sky-900' },
};

const StockCell = ({ row, unit }) => {
  if (row.stockQty === null) return <span className="text-slate-400">Not available</span>;
  if (!row.inStock) return <Badge variant="danger">Out of Stock</Badge>;
  return (
    <span>
      <Badge variant={row.stockQty <= 3 ? 'warning' : 'success'}>
        {row.stockQty <= 3 ? 'Low Stock' : 'In Stock'}
      </Badge>
      <span className="block text-[10px] text-slate-500 mt-1">
        {row.stockQty} {unit}(s) left
      </span>
    </span>
  );
};

export const ComparePanel = ({ onBrowse, onReserve }) => {
  const { compareItems, compareCount, maxCompareItems, removeCompareItem, clearCompare } = useCompare();
  const [quantityInput, setQuantityInput] = useState('1');
  const quantity = Math.max(1, parseInt(quantityInput, 10) || 1);
  const analysis = useMemo(() => analyzeOffers(compareItems, quantity), [compareItems, quantity]);
  const unit = analysis.rows[0]?.offer.unit || 'unit';

  const attrRows = [
    {
      label: 'Shop',
      render: (row) => <span className="font-bold text-slate-800">{row.shopName}</span>,
    },
    {
      label: 'Shop rating',
      render: (row) =>
        row.rating !== null ? (
          <span className="inline-flex items-center gap-1 font-bold text-amber-700">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            {row.rating.toFixed(1)}
            <span className="font-normal text-slate-400">({row.reviewCount ?? 0})</span>
          </span>
        ) : (
          <span className="text-slate-400">Not available</span>
        ),
    },
    {
      label: 'Price / unit',
      render: (row) =>
        row.pricePerUnit === null ? (
          <span className="text-slate-400">Not available</span>
        ) : (
          <span
            className={`inline-flex items-baseline gap-1.5 ${
              row.isLowestPrice ? 'rounded-lg bg-emerald-50 px-2 py-1 ring-1 ring-emerald-300' : ''
            }`}
          >
            <span className="text-base font-black text-slate-900">{formatMoney(row.pricePerUnit)}</span>
            {row.mrp && <span className="text-[10px] text-slate-400 line-through">₹{row.mrp}</span>}
            <span className="text-[10px] text-slate-500">/ {row.offer.unit || unit}</span>
          </span>
        ),
    },
    {
      label: 'Discount',
      render: (row) =>
        row.discountPercent > 0 ? (
          <Badge variant="danger">{row.discountPercent}% OFF</Badge>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      label: 'Stock',
      render: (row) => <StockCell row={row} unit={row.offer.unit || unit} />,
    },
    {
      label: `Total for ${quantity}`,
      render: (row) =>
        row.totalCost === null ? (
          <span className="text-slate-400">Not available</span>
        ) : (
          <span>
            <span className={`font-black ${row.canFulfill ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
              {formatMoney(row.totalCost)}
            </span>
            {!row.inStock && (
              <span className="block text-[10px] text-rose-600 font-semibold mt-0.5">Cannot reserve</span>
            )}
            {row.inStock && !row.canFulfill && (
              <span className="flex items-center gap-1 text-[10px] text-amber-700 font-semibold mt-0.5">
                <AlertTriangle className="w-3 h-3 flex-shrink-0" />Only {row.stockQty} left — reduce quantity
              </span>
            )}
          </span>
        ),
    },
    {
      label: 'Distance',
      render: (row) => (
        <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
          <MapPin className="w-3 h-3 text-slate-400" />
          {formatDistance(row.distanceKm)}
        </span>
      ),
    },
    {
      label: 'Delivery',
      render: (row) =>
        row.deliveryAvailable === null || row.deliveryAvailable === undefined ? (
          <span className="text-slate-400">Not available</span>
        ) : row.deliveryAvailable ? (
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
            <Truck className="w-3 h-3" />
            {row.deliveryEtaMinutes ? `~${row.deliveryEtaMinutes} min` : 'Available'}
          </span>
        ) : (
          <span className="text-slate-500">Store pickup only</span>
        ),
    },
    {
      label: 'Brand',
      render: (row) => row.offer.brand || <span className="text-slate-400">Not available</span>,
    },
    {
      label: 'Category',
      render: (row) => row.offer.category || <span className="text-slate-400">Not available</span>,
    },
  ];

  if (compareCount === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
        <Scale className="w-12 h-12 text-slate-300 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">Nothing to compare yet</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Open the <strong>Product Catalog</strong> tab and tap the <strong>Compare</strong> button on any product
          card. Add 2–4 offers — the same item from different shops works best — and they will appear here side by
          side.
        </p>
        <button
          onClick={() => onBrowse && onBrowse()}
          className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20 inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Browse Products
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Scale className="w-4 h-4 text-brand-600" /> Compare Offers ({compareCount}/{maxCompareItems})
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {analysis.rows.length} offer(s) from {new Set(analysis.rows.map((r) => r.shopIdValue)).size} shop(s).
            Prices are captured when you add an offer; the feed refreshes live every 30 seconds.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="compare-quantity" className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
            Quantity
          </label>
          <input
            id="compare-quantity"
            type="number"
            min="1"
            value={quantityInput}
            onChange={(e) => setQuantityInput(e.target.value)}
            className="w-20 px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <span className="text-[11px] text-slate-400">{unit}(s)</span>
          <button
            onClick={clearCompare}
            className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 inline-flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Clear all
          </button>
        </div>
      </div>

      {/* Exact vs similar notice */}
      {analysis.exactnessNote && (
        <div
          className={`rounded-2xl px-4 py-3 text-[11px] font-semibold flex items-start gap-2 border ${
            analysis.exactness === 'exact'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          {analysis.exactness === 'exact' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          )}
          <span>{analysis.exactnessNote}</span>
        </div>
      )}

      {/* Insufficient data notice */}
      {analysis.insufficiencyReason && (
        <div className="rounded-2xl px-4 py-3 text-[11px] font-semibold flex items-start gap-2 border border-slate-200 bg-slate-50 text-slate-600">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-slate-400" />
          <span>{analysis.insufficiencyReason}</span>
        </div>
      )}

      {/* Recommendation strip — transparent, rule-based suggestions */}
      {Object.keys(analysis.recommendations).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(analysis.recommendations).map(([key, rec]) => {
            const meta = REC_META[key];
            const Icon = meta?.icon || Award;
            return (
              <div
                key={key}
                className={`rounded-2xl border p-3.5 text-[11px] leading-relaxed ${
                  meta?.strip || 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-black uppercase tracking-wider mb-1">
                  <Icon className="w-3.5 h-3.5" /> {rec.label}
                </div>
                <p className="font-medium opacity-90">{rec.explanation}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Comparison table — horizontally scrollable on mobile, sticky attribute column */}
      <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
        <table className="w-full min-w-[760px] text-xs border-collapse">
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-10 bg-slate-50 border-b border-r border-slate-200 p-3 text-left w-36 align-bottom"
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Offer</span>
              </th>
              {analysis.rows.map((row) => (
                <th key={row.key} scope="col" className="border-b border-slate-200 p-3 text-left align-top min-w-[200px]">
                  <div className="flex items-start justify-between gap-2">
                    <img
                      src={
                        row.offer.images?.[0] ||
                        'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=200&q=80'
                      }
                      alt={row.offer.name}
                      className="w-14 h-14 rounded-xl object-cover border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeCompareItem(row.key)}
                      aria-label={`Remove ${row.shopName} offer from comparison`}
                      title="Remove from comparison"
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="font-bold text-slate-900 mt-2 leading-snug line-clamp-2">{row.offer.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {REC_KEYS.filter((k) => row[FLAG_BY_KEY[k]]).map((k) => {
                      const RecIcon = REC_META[k].icon;
                      return (
                        <span
                          key={k}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${REC_META[k].pill}`}
                        >
                          {RecIcon ? <RecIcon className="w-2.5 h-2.5" /> : null} {REC_META[k].label}
                        </span>
                      );
                    })}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {attrRows.map((attr) => (
              <tr key={attr.label} className="even:bg-slate-50/50">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-white even:bg-slate-50 border-b border-r border-slate-100 p-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400"
                >
                  {attr.label}
                </th>
                {analysis.rows.map((row) => (
                  <td key={row.key} className="border-b border-slate-100 p-3 align-top">
                    {attr.render(row)}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th
                scope="row"
                className="sticky left-0 z-10 bg-white border-r border-slate-100 p-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400"
              >
                Reserve
              </th>
              {analysis.rows.map((row) => (
                <td key={row.key} className="p-3 align-top">
                  <button
                    type="button"
                    disabled={!row.canFulfill}
                    onClick={() => onReserve && onReserve(row.offer)}
                    title={
                      !row.inStock
                        ? 'This offer is out of stock'
                        : !row.canFulfill
                        ? `Only ${row.stockQty} left — not enough for ${quantity}`
                        : `Hold ${quantity} ${row.offer.unit || 'unit'}(s) at ${row.shopName}`
                    }
                    className={`w-full py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                      row.canFulfill
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    {!row.inStock ? 'Out of Stock' : row.canFulfill ? 'Hold & Reserve' : `Only ${row.stockQty} left`}
                  </button>
                  <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                    Nothing is held until you confirm in the next step.
                  </p>
                </td>
              ))}
            </tr>

          </tbody>
        </table>
      </div>

      <div className="flex justify-center pt-1">
        <button
          onClick={() => onBrowse && onBrowse()}
          className="px-4 py-2 rounded-xl border-2 border-brand-200 text-brand-700 bg-white hover:bg-brand-50 text-xs font-bold inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Product Catalog
        </button>
      </div>



    </div>
  );
};


