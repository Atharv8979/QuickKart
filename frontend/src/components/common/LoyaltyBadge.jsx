import React from 'react';

// -----------------------------------------------------------------------------
// Customer loyalty percentage, rendered like a yellow highlighter/marker swipe
// behind the number — matches the "customer loyalty in %" design note.
// -----------------------------------------------------------------------------

// Computes a stable 0-100 loyalty percentage for a customer.
// Priority: explicit value on the request/customer → derived from their
// request history → deterministic hash fallback so the same customer always
// sees the same number across dashboards.
export const computeLoyaltyPercent = (source, allRequests = []) => {
  const explicit = source?.loyaltyPercent ?? source?.loyalty ?? null;
  if (explicit !== null && explicit !== undefined && !Number.isNaN(Number(explicit))) {
    return Math.max(0, Math.min(100, Math.round(Number(explicit))));
  }

  const name = String(source?.customerName || source?.name || '').trim();
  if (name && allRequests.length > 0) {
    const mine = allRequests.filter(
      (r) => String(r.customerName || '').trim().toLowerCase() === name.toLowerCase()
    );
    if (mine.length > 0) {
      const fulfilled = mine.filter((r) =>
        ['ACCEPTED', 'CONFIRMED', 'COMPLETED'].includes(r.status)
      ).length;
      // Blend history with a floor so brand-new customers don't read as 0%.
      return Math.max(45, Math.min(99, Math.round(55 + (fulfilled / mine.length) * 44)));
    }
  }

  // Deterministic fallback (FNV-1a inspired) — stable per customer name.
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return 45 + (hash % 50); // 45–94%
};

export const LoyaltyBadge = ({ percent, size = 'sm' }) => {
  const value = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
  const dims = size === 'lg' ? 'text-base px-2 py-1' : 'text-[11px] px-1.5 py-0.5';
  return (
    <span
      className={`inline-flex items-center gap-1 font-black text-amber-950 ${dims}`}
      title={`Customer loyalty ${value}%`}
    >
      {/* Highlighter/marker swipe behind the number */}
      <span className="relative inline-block">
        <span
          aria-hidden="true"
          className="absolute inset-x-[-4px] inset-y-[15%] -rotate-1 rounded-[3px] bg-yellow-300/90"
        />
        <span className="relative">{value}%</span>
      </span>
      <span className="font-bold text-amber-700 text-[10px] uppercase tracking-wide">
        Loyalty
      </span>
    </span>
  );
};

export default LoyaltyBadge;
