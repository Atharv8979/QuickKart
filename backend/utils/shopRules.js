// -----------------------------------------------------------------------------
// Server-side mirror of frontend/src/utils/shopRules.js.
// Enforced in productController so restricted keywords can never be saved even
// if the client-side validation is bypassed.
// -----------------------------------------------------------------------------

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
  'General Store': [],
  'Groceries & Daily Essentials': [],
};

export const getBlockedKeywords = (tag) => {
  if (!tag) return [];
  const exact = RESTRICTED_KEYWORDS_BY_TAG[tag];
  if (exact) return exact;
  const t = String(tag).toLowerCase();
  if (/general|grocer|daily|kirana|supermarket/.test(t)) return [];
  return RESTRICTED_KEYWORDS_BY_TAG['Hardware & Tools'];
};

export const findBlockedKeyword = (text, tags = []) => {
  const haystack = String(text || '').toLowerCase();
  if (!haystack.trim()) return null;
  const tagList = Array.isArray(tags) ? tags : [tags];
  for (const tag of tagList) {
    for (const keyword of getBlockedKeywords(tag)) {
      const pattern = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|[^a-z])${pattern}([^a-z]|$)`, 'i');
      if (regex.test(haystack)) return keyword;
    }
  }
  return null;
};
