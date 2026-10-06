import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ShoppingBag, Store, MessageSquare, Star, TrendingUp, Clock, HandCoins, Scale } from 'lucide-react';
import { Badge } from '../common/Badge';
import { getStockQuantity, getPriceValue, isDemoCatalogue } from './customerItemUtils';

export const ProductCard = ({ product, onReserveClick, onChatClick, onBargain, onCompareToggle, isCompared = false, medicalMode = false }) => {
  const stockQuantity = getStockQuantity(product);
  const price = getPriceValue(product);
  const mrp = Number.isFinite(Number(product.mrp)) ? Number(product.mrp) : null;
  const discountPercent =
    mrp !== null && price !== null && mrp > price
      ? Math.round(((mrp - price) / mrp) * 100)
      : 0;

  // A null/unknown stock quantity must never be rendered as "Out of Stock" —
  // only an explicit 0, isAvailable=false or an out_of_stock status means the
  // item genuinely cannot be held (see customerItemUtils.getStockQuantity).
  const isOutOfStock =
    product.stockStatus === 'out_of_stock' ||
    product.isAvailable === false ||
    (stockQuantity !== null && stockQuantity <= 0);
  const isLowStock =
    !isOutOfStock &&
    (product.stockStatus === 'low_stock' || (stockQuantity !== null && stockQuantity <= 3));
  const stockUnknown = stockQuantity === null && !product.stockStatus;
  const isDemoListing = isDemoCatalogue(product);
  const ratingValue = Number(product.rating);
  const hasRating = Number.isFinite(ratingValue);
  const hasPrice = price !== null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-card-hover transition-all duration-300 overflow-hidden flex flex-col group">
      {/* Product Image */}
      <div className="h-44 relative bg-slate-100 overflow-hidden">
        <img
          src={
            product.images?.[0] ||
            'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=600&q=80'
          }
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Discount Tag */}
        {discountPercent > 0 && (
          <span className="absolute top-2.5 left-2.5 bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
            {discountPercent}% OFF
          </span>
        )}

        {/* Honest labelling for the local demo catalogue */}
        {isDemoListing && (
          <span className="absolute bottom-2.5 left-2.5 bg-slate-950/75 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm backdrop-blur-sm">
            Demo listing
          </span>
        )}

        {/* Stock Badge */}
        <div className="absolute top-2.5 right-2.5">
          {isOutOfStock ? (
            <Badge variant="danger">Out of Stock</Badge>
          ) : stockUnknown ? (
            <Badge variant="neutral">Stock n/a</Badge>
          ) : isLowStock ? (
            <Badge variant="warning">
              {stockQuantity === null ? 'Low Stock' : `Only ${stockQuantity} Left`}
            </Badge>
          ) : (
            <Badge variant="success">In Stock</Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>{product.brand}</span>
            <span className="text-brand-600 font-bold bg-brand-50 px-2 py-0.5 rounded-md">
              {product.category}
            </span>
          </div>

          <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-brand-600 transition-colors">
            {product.name}
          </h4>

          <div className="flex items-center gap-2 mt-1.5 text-[11px]">
            {hasRating && (
              <span className="flex items-center gap-0.5 font-bold text-amber-700">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {ratingValue.toFixed(1)}
                <span className="font-normal text-slate-400">({product.reviewCount || 0})</span>
              </span>
            )}
            {product.demandLabel && (
              <span className="flex items-center gap-0.5 text-emerald-600 font-semibold">
                <TrendingUp className="w-3 h-3" /> {product.demandLabel}
              </span>
            )}
          </div>
          {product.lastStockUpdate && (
            <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
              <Clock className="w-3 h-3" /> Stock checked {product.lastStockUpdate}
            </div>
          )}

          {/* Pricing */}
          <div className="flex items-baseline gap-2 mt-2">
            {hasPrice ? (
              <>
                <span className="text-lg font-black text-slate-900">₹{price}</span>
                {mrp !== null && mrp > price && (
                  <span className="text-xs text-slate-400 line-through">
                    ₹{mrp}
                  </span>
                )}
                <span className="text-xs text-slate-500">/ {product.unit}</span>
              </>
            ) : (
              <span className="text-xs font-bold text-slate-400">
                Price not listed — ask the shop
              </span>
            )}
          </div>

        </div>

        {/* Shop Info Footer */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          {product.shopId && (
            <div className="flex items-center justify-between text-xs">
              <Link
                to={`/shops/${product.shopId._id || product.shopId}`}
                className="font-semibold text-slate-700 hover:text-brand-600 truncate flex items-center gap-1"
              >
                <Store className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{product.shopId.shopName || 'Local Shop'}</span>
              </Link>
              {product.distanceKm !== undefined && (
                <span className="text-brand-600 font-bold text-[11px] flex-shrink-0 flex items-center gap-0.5">
                  <MapPin className="w-3 h-3" />
                  {product.distanceKm < 1
                    ? `${Math.round(product.distanceKm * 1000)} m`
                    : `${product.distanceKm.toFixed(1)} km`}
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            {onCompareToggle && (
              <button
                onClick={() => onCompareToggle(product)}
                aria-pressed={isCompared}
                className={`p-2 rounded-xl transition-colors ${
                  isCompared
                    ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title={isCompared ? 'Remove from comparison' : 'Add to comparison'}
              >
                <Scale className="w-4 h-4" />
              </button>
            )}
            {onBargain && (
              <button
                type="button"
                onClick={() => onBargain(product)}
                className="p-2 rounded-xl text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
                title="Bargain with shop owner"
              >
                <HandCoins className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onChatClick && onChatClick(product)}
              className="p-2 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              title="Chat with shopkeeper"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              onClick={() => onReserveClick && onReserveClick(product)}
              disabled={isOutOfStock}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                isOutOfStock
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/20'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              {medicalMode ? 'Hold at Pharmacy' : 'Hold & Reserve'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
