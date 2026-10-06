// Pure, rule-based helpers powering the customer Product Comparison feature.
// No AI/ML involved — every recommendation below is a deterministic, explainable rule.

export const MAX_COMPARE_ITEMS = 4;

const FILLER_WORDS = new Set(['of', 'the', 'with', 'and', 'for', 'a', 'an']);

// Strips pack-size tokens (e.g. "5kg", "1 inch", "10ft") so "PVC Pipe 1 inch"
// and "PVC Pipe 2 inch" are still treated as the same core product family.
const SIZE_TOKEN = /^\d+(\.\d+)?(kg|g|gm|l|ml|m|cm|mm|ft|inch|in|pcs|piece|pieces|pack|bag|bottle|box|coil|can|kit|unit|strip)$/;

export const normalizeOfferName = (name = '') =>
  String(name)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token && !FILLER_WORDS.has(token) && !SIZE_TOKEN.test(token))
    .sort()
    .join(' ');

export const getShopIdValue = (offer) =>
  offer?.shopId?._id || offer?.shopId?.id || offer?.shopId || null;

export const getShopName = (offer) =>
  offer?.shopId?.shopName || offer?.shopName || 'Local Shop';

export const getStockQty = (offer) => {
  const qty = Number(offer?.quantityInStock);
  return Number.isFinite(qty) ? qty : null;
};

export const isOfferInStock = (offer) =>
  offer?.isAvailable !== false && (getStockQty(offer) ?? 1) > 0;

export const canFulfillQuantity = (offer, quantity) => {
  const stock = getStockQty(offer);
  return isOfferInStock(offer) && stock !== null && stock >= quantity;
};

export const formatMoney = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const rounded = Math.round(num * 100) / 100;
  return `₹${Number.isInteger(rounded) ? rounded : rounded.toFixed(2)}`;
};

export const formatDistance = (distanceKm) => {
  const km = Number(distanceKm);
  if (!Number.isFinite(km)) return 'Not available';
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
};

/**
 * Are two offers the *same* product (as far as available fields prove)?
 * Requires same category + same unit + same normalized core name.
 * Brand is only compared when both offers actually specify one, so a missing
 * brand never silently disqualifies an exact match.
 */
export const areEquivalentOffers = (a, b) => {
  if (!a || !b) return false;
  const sameCategory = !a.category || !b.category || a.category === b.category;
  const sameUnit = !a.unit || !b.unit || String(a.unit).toLowerCase() === String(b.unit).toLowerCase();
  const sameCoreName = normalizeOfferName(a.name || a.productName || '') === normalizeOfferName(b.name || b.productName || '');
  const bothBranded = Boolean(a.brand && b.brand);
  const sameBrand = !bothBranded || String(a.brand).toLowerCase() === String(b.brand).toLowerCase();
  return sameCategory && sameUnit && sameCoreName && sameBrand;
};

const buildRow = (offer, quantity) => {
  const price = Number(offer.price ?? offer.offeredPrice);
  const stockQty = getStockQty(offer);
  const mrp = Number(offer.mrp);
  const hasMrp = Number.isFinite(mrp) && mrp > price;
  return {
    offer,
    key: offer._id || offer.id,
    shopIdValue: getShopIdValue(offer),
    shopName: getShopName(offer),
    pricePerUnit: Number.isFinite(price) ? price : null,
    totalCost: Number.isFinite(price) ? price * quantity : null,
    mrp: hasMrp ? mrp : null,
    discountPercent: hasMrp ? Math.round(((mrp - price) / mrp) * 100) : 0,
    stockQty,
    inStock: isOfferInStock(offer),
    canFulfill: canFulfillQuantity(offer, quantity),
    rating: Number.isFinite(Number(offer.rating)) && offer.rating !== undefined && offer.rating !== null
      ? Number(offer.rating)
      : null,
    reviewCount: Number.isFinite(Number(offer.reviewCount)) ? Number(offer.reviewCount) : null,
    distanceKm: Number.isFinite(Number(offer.distanceKm))
      ? Number(offer.distanceKm)
      : Number.isFinite(Number(offer.shopId?.distanceKm))
      ? Number(offer.shopId.distanceKm)
      : null,
    deliveryAvailable: offer.deliveryAvailable ?? offer.shopId?.deliveryAvailable ?? null,
    deliveryEtaMinutes: offer.deliveryEtaMinutes ?? offer.shopId?.deliveryEtaMinutes ?? null,
  };
};

/**
 * Main entry point.
 * @param {Array} offers  raw product snapshots (each = one product at one shop)
 * @param {number} quantity quantity the customer intends to purchase
 * @returns {object} { exactness, exactnessNote, rows, recommendations, insufficiencyReason }
 */
export const analyzeOffers = (offers = [], quantity = 1) => {
  const rows = offers.map((offer) => buildRow(offer, quantity));

  // --- Equivalence detection (exact vs similar) ---
  let exactness = 'single';
  let exactnessNote = '';
  if (rows.length >= 2) {
    const allExact = rows.every((row) => rows.every((other) => areEquivalentOffers(row.offer, other.offer)));
    exactness = allExact ? 'exact' : 'similar';
    exactnessNote = allExact
      ? `Exact match — the same product listed by ${rows.length} different shops.`
      : 'Similar products — names, brands or pack details differ. Verify specifications before reserving.';
  }

  const fulfillable = rows.filter((row) => row.canFulfill);
  const inStockRows = rows.filter((row) => row.inStock);
  const pricedRows = rows.filter((row) => row.pricePerUnit !== null);
  const ratedRows = rows.filter((row) => row.rating !== null);
  const recommendations = {};
  let insufficiencyReason = '';

  if (rows.length < 2) {
    insufficiencyReason = 'Select at least 2 offers to unlock comparisons and recommendations.';
  } else if (!inStockRows.length) {
    insufficiencyReason = 'Every compared offer is currently out of stock — no recommendation is possible right now.';
  } else if (!pricedRows.length) {
    insufficiencyReason = 'Compared offers have no price information, so no recommendation is possible.';
  } else if (fulfillable.length) {
    // --- Best Value: cheapest total among offers that CAN fulfill this quantity.
    // Never awarded from price alone when nothing can fulfill the basket.
    const bestValue = [...fulfillable].sort((a, b) => {
      const byPrice = a.totalCost - b.totalCost;
      if (byPrice !== 0) return byPrice;
      return (b.rating ?? -1) - (a.rating ?? -1);
    })[0];
    const runnerUp = fulfillable
      .filter((row) => row.key !== bestValue.key)
      .sort((a, b) => a.totalCost - b.totalCost)[0];
    const saving = runnerUp ? runnerUp.totalCost - bestValue.totalCost : 0;
    const ratingPart = bestValue.rating !== null
      ? `, rated ${bestValue.rating.toFixed(1)}★${bestValue.reviewCount !== null ? ` (${bestValue.reviewCount} reviews)` : ''}`
      : '';
    recommendations.bestValue = {
      row: bestValue,
      label: 'Best Value',
      explanation: `Best value — ${formatMoney(bestValue.totalCost)} total for ${quantity} ${
        rows[0].offer.unit || 'unit'
      } at ${bestValue.shopName}, in stock (${bestValue.stockQty} left)${ratingPart}.${
        saving > 0 && runnerUp ? ` That saves ${formatMoney(saving)} versus ${runnerUp.shopName}.` : ''
      }`,
    };

    // --- Lowest Price: cheapest unit price among fulfillable offers, with savings vs next best.
    const lowest = [...fulfillable].sort((a, b) => a.pricePerUnit - b.pricePerUnit)[0];
    const nextCheapest = fulfillable
      .filter((row) => row.key !== lowest.key)
      .sort((a, b) => a.pricePerUnit - b.pricePerUnit)[0];
    const unitSaving = nextCheapest ? nextCheapest.pricePerUnit - lowest.pricePerUnit : 0;
    const savingPart =
      unitSaving > 0 && nextCheapest
        ? ` That saves ${formatMoney(unitSaving * quantity)} (${Math.round(
            (unitSaving / nextCheapest.pricePerUnit) * 100
          )}%) versus ${nextCheapest.shopName} for ${quantity} ${rows[0].offer.unit || 'unit'}.`
        : ' Another shop lists the same unit price.';
    recommendations.lowestPrice = {
      row: lowest,
      label: 'Lowest Price',
      explanation: `Lowest price — ${formatMoney(lowest.pricePerUnit)} per ${
        lowest.offer.unit || 'unit'
      } at ${lowest.shopName}.${savingPart}`,
    };
  } else {
    insufficiencyReason = `None of the compared offers has enough stock for ${quantity} ${
      rows[0].offer.unit || 'unit'
    }(s) — showing prices and stock without forcing a winner.`;
  }

  // --- Best Rated: only when at least 2 offers carry rating data (reasonably comparable),
  // and missing ratings are disclosed rather than treated as a bad score.
  if (ratedRows.length >= 2) {
    const bestRated = [...ratedRows].sort((a, b) => b.rating - a.rating)[0];
    const missing = rows.length - ratedRows.length;
    recommendations.bestRated = {
      row: bestRated,
      label: 'Best Rated',
      explanation: `Best rated — ${bestRated.rating.toFixed(1)}★ at ${bestRated.shopName}${
        bestRated.reviewCount !== null ? ` based on ${bestRated.reviewCount} reviews` : ''
      }.${missing > 0 ? ` ${missing} of ${rows.length} compared offers have no rating yet.` : ''}`,
    };
  }

  // --- Best Availability: largest known in-stock quantity.
  const withStock = inStockRows.filter((row) => row.stockQty !== null);
  if (withStock.length >= 2) {
    const bestAvailability = [...withStock].sort((a, b) => b.stockQty - a.stockQty)[0];
    recommendations.bestAvailability = {
      row: bestAvailability,
      label: 'Best Availability',
      explanation: `Best availability — ${bestAvailability.stockQty} ${
        bestAvailability.offer.unit || 'unit'
      }(s) in stock at ${bestAvailability.shopName}.`,
    };
  }

  // Flag rows for visual highlighting (a row can win several badges).
  const flaggedRows = rows.map((row) => ({
    ...row,
    isBestValue: recommendations.bestValue?.row.key === row.key,
    isLowestPrice: recommendations.lowestPrice?.row.key === row.key,
    isBestRated: recommendations.bestRated?.row.key === row.key,
    isBestAvailability: recommendations.bestAvailability?.row.key === row.key,
  }));

  return { exactness, exactnessNote, rows: flaggedRows, recommendations, insufficiencyReason };
};

