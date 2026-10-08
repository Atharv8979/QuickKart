// -----------------------------------------------------------------------------
// Shop taxonomy rules shared across registration, inventory & discovery.
// A shop selects one or more TAGS at account creation (e.g. hardware,
// software, general store). Each tag family restricts which product keywords
// are allowed so e.g. a hardware shop cannot list "aata" or "refined oil".
// -----------------------------------------------------------------------------

// Master tag catalogue — used by RegisterPage (multi-select) and shown in the
// shopkeeper header. Keep labels in sync with backend/utils/shopRules.js.
export const SHOP_TAGS = [
  'Hardware & Tools',
  'Plumbing & Sanitary',
  'Electrical & Lighting',
  'Software & IT',
  'General Store',
  'Groceries & Daily Essentials',
  'Stationery & Office',
  'Electronics & Mobiles',
  'Medicines & Wellness',
];

// Keywords a shop may NEVER list, grouped by tag family. Matching is done on
// word boundaries against the product name + description, case-insensitive.
const RESTRICTED_KEYWORDS_BY_TAG = {
  'Hardware & Tools': [
    'aata', 'atta', 'flour', 'maida', 'suji', 'besan', 'rice', 'chawal',
    'dal', 'lentil', 'sugar', 'chini', 'salt', 'namak', 'masala', 'spice',
    'refined oil', 'oil', 'ghee', 'butter', 'milk', 'dahi', 'curd', 'paneer',
    'tea', 'chai', 'coffee', 'biscuit', 'namkeen', 'poha', 'cornflakes',
    'noodle', 'pasta', 'sauce', 'ketchup', 'pickle', 'honey', 'juice',
  ],
  'Plumbing & Sanitary': [
    'aata', 'atta', 'flour', 'rice', 'dal', 'sugar', 'salt', 'masala',
    'refined oil', 'oil', 'ghee', 'milk', 'tea', 'coffee', 'biscuit', 'namkeen',
  ],
  'Electrical & Lighting': [
    'aata', 'atta', 'flour', 'rice', 'dal', 'sugar', 'salt', 'masala',
    'refined oil', 'oil', 'ghee', 'milk', 'tea', 'coffee', 'biscuit', 'namkeen',
  ],
  'Software & IT': [
    'aata', 'atta', 'flour', 'rice', 'dal', 'sugar', 'salt', 'masala',
    'refined oil', 'oil', 'ghee', 'milk', 'tea', 'coffee', 'biscuit', 'namkeen',
    'cement', 'paint', 'pipe', 'drill',
  ],
  'Electronics & Mobiles': [
    'aata', 'atta', 'flour', 'rice', 'dal', 'sugar', 'salt', 'masala',
    'refined oil', 'oil', 'ghee', 'milk', 'tea', 'coffee', 'biscuit', 'namkeen',
  ],
  'Stationery & Office': [
    'aata', 'atta', 'flour', 'rice', 'dal', 'sugar', 'refined oil', 'oil',
    'ghee', 'milk', 'tea', 'coffee',
  ],
  'Medicines & Wellness': [
    'aata', 'atta', 'flour', 'rice', 'dal', 'sugar', 'refined oil', 'oil',
    'ghee', 'milk', 'cement', 'paint', 'drill',
  ],
  // General store & grocery tags accept everyday food staples — no blocks.
  'General Store': [],
  'Groceries & Daily Essentials': [],
};

// Tags that may list everyday food/grocery staples without restriction.
export const GROCERY_FRIENDLY_TAGS = ['General Store', 'Groceries & Daily Essentials'];

// Returns the list of blocked keywords for a shop tag (empty array if none).
export const getBlockedKeywords = (tag) => {
  if (!tag) return [];
  const exact = RESTRICTED_KEYWORDS_BY_TAG[tag];
  if (exact) return exact;
  // Loose match: unknown/custom categories default to grocery restrictions
  // unless they look grocery-ish themselves.
  const t = String(tag).toLowerCase();
  if (/general|grocer|daily|kirana|supermarket/.test(t)) return [];
  return RESTRICTED_KEYWORDS_BY_TAG['Hardware & Tools'];
};

// Scans text for any keyword blocked by the shop's tags.
// Returns the matched keyword (string) or null when the text is allowed.
export const findBlockedKeyword = (text, tags = []) => {
  const haystack = String(text || '').toLowerCase();
  if (!haystack.trim()) return null;
  const tagList = Array.isArray(tags) ? tags : [tags];
  for (const tag of tagList) {
    for (const keyword of getBlockedKeywords(tag)) {
      const pattern = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Word-boundary match so "clothing" doesn't trip "shirt"-style partials
      // and multi-word phrases like "refined oil" work as-is.
      const regex = new RegExp(`(^|[^a-z])${pattern}([^a-z]|$)`, 'i');
      if (regex.test(haystack)) return keyword;
    }
  }
  return null;
};

// Friendly error message for a rejected product listing.
export const blockedKeywordMessage = (keyword, tags = []) => {
  const tagList = Array.isArray(tags) ? tags : [tags];
  const tagText = tagList.filter(Boolean).join(', ') || 'this shop';
  return `"${keyword}" cannot be listed by a shop tagged: ${tagText}. Please remove that keyword or contact admin to update your shop tags.`;
};
