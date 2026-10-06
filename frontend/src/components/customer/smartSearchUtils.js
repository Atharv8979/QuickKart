// Pure, rule-based intent-matching helpers powering the customer Smart Search
// feature. No AI/ML involved — every match, ranking and explanation below is a
// deterministic, explainable rule so any result can be justified to the user.

import { areEquivalentOffers, formatDistance } from './compareUtils';

// ---------------------------------------------------------------------------
// Text normalization
// ---------------------------------------------------------------------------

// Words that carry no product meaning ("I need a cheap drill" → "drill").
// Budget/quantity words are handled by dedicated parsers below.
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'for', 'of', 'and', 'with', 'to', 'in', 'at', 'on', 'from',
  'my', 'me', 'i', 'need', 'needs', 'want', 'some', 'any', 'buy', 'get', 'find',
  'show', 'please', 'looking', 'best', 'good', 'give',
]);

export const normalizeText = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token && !STOP_WORDS.has(token))
    .join(' ');

export const tokenize = (value = '') => normalizeText(value).split(' ').filter(Boolean);

// ---------------------------------------------------------------------------
// Vocabulary expansion — everyday words (incl. common Hindi transliterations)
// mapped onto catalogue vocabulary, so "dawai" still finds medicines and
// "nal" still finds taps.
// ---------------------------------------------------------------------------

const SYNONYM_MAP = {
  led: ['bulb', 'light'],
  bulb: ['led', 'light'],
  light: ['bulb', 'led'],
  lamp: ['light', 'bulb'],
  phone: ['mobile', 'smartphone', 'charger'],
  mobile: ['phone', 'smartphone'],
  smartphone: ['mobile', 'phone'],
  earphone: ['earphones', 'headphone', 'headphones'],
  earphones: ['earphone', 'headphone', 'headphones'],
  headphone: ['headphones', 'earphone'],
  headphones: ['headphone', 'earphone'],
  charger: ['adapter', 'cable', 'charging'],
  cable: ['charger', 'usb'],
  powerbank: ['power', 'bank', 'battery'],
  television: ['tv', 'smart'],
  tv: ['television', 'smart'],
  medicine: ['tablet', 'tablets', 'strip'],
  dawai: ['medicine', 'tablet'],
  tablet: ['tablets', 'medicine'],
  fever: ['paracetamol', 'thermometer'],
  bukhar: ['fever', 'paracetamol'],
  pain: ['paracetamol', 'relief'],
  cold: ['cetirizine'],
  sardi: ['cold', 'cetirizine'],
  cough: ['cetirizine'],
  allergy: ['cetirizine'],
  notebook: ['notebooks', 'register', 'book'],
  notebooks: ['notebook', 'register', 'book'],
  pen: ['pens', 'ballpoint'],
  pens: ['pen', 'ballpoint'],
  scale: ['geometry', 'instrument'],
  tap: ['faucet', 'brass'],
  nal: ['tap', 'faucet'],
  faucet: ['tap'],
  pipe: ['pvc', 'plumbing'],
  paani: ['water', 'pipe', 'tap'],
  water: ['pump'],
  wrench: ['pipe', 'plumbing'],
  wire: ['copper', 'wiring'],
  wiring: ['wire', 'copper'],
  switch: ['modular', 'electrical'],
  socket: ['extension', 'board'],
  extension: ['socket', 'board'],
  pump: ['motor', 'water'],
  motor: ['pump', 'mono'],
  drill: ['drilling', 'impact'],
  drilling: ['drill'],
  hammer: ['claw', 'steel'],
  screw: ['screws', 'ms'],
  screws: ['screw'],
  paint: ['emulsion', 'apex'],
  atta: ['flour', 'grocery'],
  chai: ['tea', 'grocery'],
  chhanni: ['strainer', 'sieve'],
  sanitizer: ['hand', 'sanitiser'],
  bandage: ['crepe', 'elastic'],
  thermometer: ['temperature', 'digital'],
};

const expandToken = (token) => {
  const expanded = new Set([token]);
  (SYNONYM_MAP[token] || []).forEach((synonym) => expanded.add(synonym));
  return expanded;
};

// ---------------------------------------------------------------------------
// Intent parsing — budget ("under ₹100"), quantity ("2 kg"), use-cases
// ("something to fix a leaking pipe") and compare-shopping phrasing.
// ---------------------------------------------------------------------------

const BUDGET_PATTERNS = [
  /(?:under|below|less than|max(?:imum)?|upto|up to|within|budget of|budget)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)/i,
  /(?:₹|rs\.?|inr)\s*(\d+(?:\.\d+)?)/i,
  /(\d+(?:\.\d+)?)\s*(?:₹|rs\.?|inr)/i,
];

const UNIT_PATTERN = /(\d+(?:\.\d+)?)\s*(kg|kgs|gram|grams|gms?|litre|liter|litres|l|ml|piece|pieces|pcs|pc|pack|packs|box|boxes|dozen|doz|meter|meters|mtr|feet|ft|inch|inches|ream|reams|strip|strips|book|books|coil|coils|can|cans|kit|kits|unit|units|bottle|bottles|sachet|sachets)\b/i;

const USE_CASE_INTENTS = [
  {
    id: 'plumbing-fix',
    label: 'Fixing a leak / plumbing',
    keywords: ['leak', 'leaking', 'leakage', 'pipe', 'tap', 'nal', 'paani', 'bathroom', 'sink', 'toilet', 'plumbing'],
    category: 'Plumbing & Sanitary',
    terms: ['pipe', 'tap', 'wrench', 'pvc'],
  },
  {
    id: 'wall-fix',
    label: 'Drilling / mounting / repair',
    keywords: ['drill', 'wall', 'hang', 'mount', 'fix', 'repair', 'screw', 'screws', 'hammer'],
    category: 'Hardware & Tools',
    terms: ['drill', 'screw', 'hammer', 'paint'],
  },
  {
    id: 'power-cut',
    label: 'Power backup / wiring',
    keywords: ['power', 'cut', 'bijli', 'inverter', 'battery', 'extension', 'socket', 'wiring', 'wire'],
    category: 'Electrical & Lighting',
    terms: ['extension', 'wire', 'bulb', 'switch'],
  },
  {
    id: 'study',
    label: 'School / study supplies',
    keywords: ['school', 'study', 'studies', 'exam', 'student', 'college', 'padhai'],
    category: 'Stationery & Office',
    terms: ['notebook', 'pen', 'geometry', 'marker'],
  },
  {
    id: 'office',
    label: 'Office supplies',
    keywords: ['office', 'printer', 'photocopy', 'xerox', 'files'],
    category: 'Stationery & Office',
    terms: ['paper', 'marker', 'pen', 'sticky'],
  },
  {
    id: 'fever-cold',
    label: 'Fever / cold relief',
    keywords: ['fever', 'bukhar', 'cold', 'cough', 'flu', 'sardi', 'pain', 'headache', 'bodyache'],
    category: 'Medicines & Wellness',
    terms: ['paracetamol', 'cetirizine', 'thermometer', 'antacid'],
  },
  {
    id: 'first-aid',
    label: 'First aid',
    keywords: ['wound', 'wounds', 'cut', 'injury', 'bandage', 'antiseptic', 'firstaid'],
    category: 'Medicines & Wellness',
    terms: ['bandage', 'sanitizer'],
  },
  {
    id: 'phone-accessories',
    label: 'Phone & accessories',
    keywords: ['phone', 'mobile', 'charging', 'charge', 'typec', 'earphone', 'earphones', 'headphone', 'headphones'],
    category: 'Electronics & Mobiles',
    terms: ['charger', 'cable', 'earphone', 'powerbank'],
  },
  {
    id: 'kitchen',
    label: 'Kitchen & groceries',
    keywords: ['kitchen', 'rasoi', 'cook', 'cooking', 'grocery', 'atta', 'rice', 'oil', 'sugar', 'dal'],
    category: 'Groceries & Daily Essentials',
    terms: [],
  },
  {
    id: 'farm-water',
    label: 'Farm / water pumping',
    keywords: ['borewell', 'farm', 'farming', 'kheti', 'pump', 'motor', 'irrigation'],
    category: 'Electrical & Lighting',
    terms: ['pump', 'wire'],
  },
];

export const parseQueryIntent = (rawQuery = '') => {
  const trimmed = String(rawQuery).trim();

  let budgetMax = null;
  for (const pattern of BUDGET_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      if (Number.isFinite(value) && value > 0) {
        budgetMax = value;
        break;
      }
    }
  }

  let quantity = null;
  const quantityMatch = trimmed.match(UNIT_PATTERN);
  if (quantityMatch) {
    const value = parseFloat(quantityMatch[1]);
    const unit = quantityMatch[2].toLowerCase();
    if (Number.isFinite(value) && value > 0) quantity = { value, unit };
  }

  const normalized = normalizeText(trimmed);
  const baseTokens = tokenize(trimmed);

  // Expand every base token with its synonyms so e.g. "dawai" also searches
  // for "tablet"/"medicine", and "led" also matches "bulb".
  const expandedTokens = new Set();
  baseTokens.forEach((token) => expandToken(token).forEach((expanded) => expandedTokens.add(expanded)));

  const matchedIntents = USE_CASE_INTENTS.filter((intent) =>
    baseTokens.some((token) => intent.keywords.includes(token) || intent.terms.includes(token))
  );

  // Strip numeric/budget tokens from the keyword set used for product matching
  // so "under 100" doesn't try to match a product named "100".
  const keywordTokens = [...expandedTokens].filter(
    (token) => !(quantity && String(quantity.value) === token) && !/^\d+(\.\d+)?$/.test(token)
  );

  const wantsCompareShops = /\b(compare|cheapest|best price|sasta|sabse|difference|options|alternatives|shops?)\b/.test(normalized);

  return {
    rawQuery: trimmed,
    normalized,
    baseTokens,
    tokens: keywordTokens,
    budgetMax,
    quantity,
    intents: matchedIntents,
    wantsCompareShops,
  };
};

// ---------------------------------------------------------------------------
// Distance helpers — used to rank/nearby-filter results via LocationContext.
// ---------------------------------------------------------------------------

// Demo data anchor: VIT Bhopal University, Kothri Kalan (matches sehoreDemoData.js).
export const DEMO_ANCHOR = { lat: 23.0755, lng: 76.8498, label: 'VIT Bhopal, Kothri Kalan (Sehore)' };

export const haversineKm = (pointA, pointB) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(pointB.lat - pointA.lat);
  const dLng = toRad(pointB.lng - pointA.lng);
  const lat1 = toRad(pointA.lat);
  const lat2 = toRad(pointB.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};

// The Sehore demo catalogue should only appear for users anchored around the
// Sehore/Bhopal demo region (same policy as the discover feed).
export const isDemoRegion = (coordinates, addressText = '') => {
  const text = String(addressText || '').toLowerCase();
  if (/(sehore|ashta|bhopal|kothri|vidisha)/.test(text)) return true;
  if (Array.isArray(coordinates) && coordinates.length >= 2) {
    const [lng, lat] = coordinates;
    if ([lng, lat].every(Number.isFinite)) return haversineKm({ lat, lng }, DEMO_ANCHOR) <= 150;
  }
  return false;
};

export const getShopCoordinates = (product) => {
  const coords = product?.shopId?.location?.coordinates;
  if (Array.isArray(coords) && coords.length >= 2 && [coords[0], coords[1]].every(Number.isFinite)) {
    return { lng: coords[0], lat: coords[1] };
  }
  return null;
};

export const getProductDistanceKm = (product, coordinates) => {
  const shopCoords = getShopCoordinates(product);
  if (!shopCoords || !Array.isArray(coordinates) || coordinates.length < 2) return null;
  const [lng, lat] = coordinates;
  if (![lng, lat].every(Number.isFinite)) return null;
  return haversineKm({ lat, lng }, shopCoords);
};

const isProductInStock = (product) =>
  product.isAvailable !== false && Number(product.quantityInStock ?? 1) > 0;

const scoreProduct = (product, parsed, context) => {
  const nameTokens = tokenize(product.name || '');
  const brandTokens = tokenize(product.brand || '');
  const categoryTokens = tokenize(product.category || '');
  const extraText = tokenize(
    `${Array.isArray(product.tags) ? product.tags.join(' ') : product.tags || ''} ${product.description || ''}`
  );
  const nameSet = new Set(nameTokens);
  const brandSet = new Set(brandTokens);
  const categorySet = new Set(categoryTokens);

  let score = 0;
  const reasons = [];
  let hits = 0;

  parsed.tokens.forEach((token) => {
    if (nameSet.has(token)) {
      score += 6;
      hits += 1;
      reasons.push(`"${token}" matches the product name`);
    } else if (brandSet.has(token)) {
      score += 4;
      hits += 1;
      reasons.push(`"${token}" matches the brand`);
    } else if (categorySet.has(token)) {
      score += 3;
      hits += 1;
      reasons.push(`"${token}" matches the category`);
    } else if (extraText.includes(token)) {
      score += 1;
      hits += 1;
      reasons.push(`"${token}" appears in the product details`);
    }
  });

  // Keyword hits are required, UNLESS the product's category directly matches
  // a detected use-case intent (e.g. "fix a leaking pipe" → Plumbing &
  // Sanitary) — intent-category matches are valid results on their own.
  const hasIntentCategoryMatch = parsed.intents.some(
    (intent) => intent.category && (product.category || '') === intent.category
  );
  if (hits === 0 && !hasIntentCategoryMatch) return null;

  // Use-case intent bonus: a product whose category matches the detected
  // intent (e.g. "fix a leaking pipe" → Plumbing & Sanitary) ranks up.
  parsed.intents.forEach((intent) => {
    if (intent.category && (product.category || '') === intent.category) {
      score += 4;
      reasons.push(`fits your intent: ${intent.label}`);
    } else if (intent.terms.some((term) => nameSet.has(term) || categorySet.has(term) || extraText.includes(term))) {
      score += 2;
      reasons.push(`fits your intent: ${intent.label}`);
    }
  });

  const price = Number(product.price ?? product.offeredPrice);
  let overBudget = false;
  if (parsed.budgetMax != null && Number.isFinite(price)) {
    if (price <= parsed.budgetMax) {
      score += 3;
      reasons.push(`₹${price} fits your budget of ₹${parsed.budgetMax}`);
    } else {
      score -= 4;
      overBudget = true;
      reasons.push(`₹${price} is above your budget of ₹${parsed.budgetMax}`);
    }
  }

  if (parsed.quantity && product.unit) {
    if (String(product.unit).toLowerCase() === parsed.quantity.unit) {
      score += 2;
      reasons.push(`sold in the unit you asked for (${parsed.quantity.unit})`);
    }
  }

  let distanceKm = null;
  if (context.coordinates) {
    distanceKm = getProductDistanceKm(product, context.coordinates);
    if (distanceKm != null && distanceKm <= 10) {
      score += 2;
      reasons.push(`only ${formatDistance(distanceKm)} away`);
    }
  }

  if (isProductInStock(product)) {
    score += 1;
  } else {
    score -= 3;
    reasons.push('currently out of stock');
  }

  return { product, score, reasons, overBudget, distanceKm, inStock: isProductInStock(product) };
};

/**
 * Search a product corpus with the parsed intent.
 * Returns ranked matches with human-readable reasons, plus grouped
 * "same product, multiple shops" views for compare-style queries.
 */
export const searchCatalogue = (products, rawQuery, context = {}) => {
  const parsed = parseQueryIntent(rawQuery);

  if (parsed.tokens.length === 0) {
    return { parsed, matches: [], groups: [], multiShopGroups: [], alternatives: [], emptyReason: 'empty-query' };
  }

  const regionLocked = Boolean(context.demoRegion);

  const scored = [];
  products.forEach((product) => {
    // Demo catalogue gating: skip demo rows when the user is not in the demo
    // region, or when they sit outside their selected radius.
    const isDemo = String(product._id || product.id || '').startsWith('sehore-item-');
    if (isDemo) {
      if (!regionLocked) return;
      if (context.radiusKm != null) {
        const distance = getProductDistanceKm(product, context.coordinates);
        if (distance != null && distance > context.radiusKm) return;
      }
    }
    const result = scoreProduct(product, parsed, context);
    if (result && result.score > 0) scored.push(result);
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const priceA = Number(a.product.price ?? a.product.offeredPrice ?? Infinity);
    const priceB = Number(b.product.price ?? b.product.offeredPrice ?? Infinity);
    if (priceA !== priceB) return priceA - priceB;
    const distA = a.distanceKm ?? Infinity;
    const distB = b.distanceKm ?? Infinity;
    return distA - distB;
  });

  const matches = scored.slice(0, 24);

  // Group equivalent offers of the same product across shops (reuses the
  // comparison feature's equivalence rules).
  const groups = [];
  matches.forEach((match) => {
    const existing = groups.find((group) => areEquivalentOffers(group[0].product, match.product));
    if (existing) existing.push(match);
    else groups.push([match]);
  });

  const multiShopGroups = groups
    .filter((group) => group.length > 1)
    .map((group) =>
      [...group].sort((a, b) => Number(a.product.price ?? Infinity) - Number(b.product.price ?? Infinity))
    );

  const alternatives = matches.length === 0 ? suggestAlternatives(products, parsed, context, 4) : [];

  return { parsed, matches, groups, multiShopGroups, alternatives, emptyReason: null };
};

/**
 * Honest "no exact match" fallback: suggest in-stock products from the
 * categories implied by the detected use-case intents (or cheapest available
 * items when no intent was detected), clearly labelled as alternatives.
 */
export const suggestAlternatives = (products, parsed, context, limit = 4) => {
  const regionLocked = Boolean(context.demoRegion);
  const candidateCategories = new Set(parsed.intents.map((intent) => intent.category).filter(Boolean));

  const eligible = products.filter((product) => {
    const isDemo = String(product._id || product.id || '').startsWith('sehore-item-');
    if (isDemo && !regionLocked) return false;
    return isProductInStock(product);
  });

  let pool = eligible;
  if (candidateCategories.size > 0) {
    const fromCategories = eligible.filter((product) => candidateCategories.has(product.category || ''));
    if (fromCategories.length > 0) pool = fromCategories;
  }

  return [...pool]
    .sort((a, b) => Number(a.price ?? a.offeredPrice ?? Infinity) - Number(b.price ?? b.offeredPrice ?? Infinity))
    .slice(0, limit);
};

/** Human-readable chips describing what the search understood. */
export const describeIntent = (parsed) => {
  const parts = [];
  if (parsed.budgetMax != null) parts.push(`budget under ₹${parsed.budgetMax}`);
  if (parsed.quantity) parts.push(`quantity ${parsed.quantity.value} ${parsed.quantity.unit}`);
  parsed.intents.forEach((intent) => parts.push(intent.label));
  return parts;
};
