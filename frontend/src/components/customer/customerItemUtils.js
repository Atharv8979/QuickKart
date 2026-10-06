// Shared, dependency-free helpers for the customer-facing components.
//
// Why this file exists: the customer UI mixes three different data shapes —
//  1. live API rows (UUID `_id` / `quantityInStock` / nested `shopId`),
//  2. raw Supabase rows (`id` / `quantity_in_stock` / `shop_id`),
//  3. the local demo catalogue (slug ids such as `sehore-item-atta`).
// Demo slugs can never be posted to UUID database columns directly — the
// backend routes them to a linked live partner shop (see
// `resolveLiveShopId` in `reservationController.js`), so these helpers mark
// demo holds as `isDemoRouted` instead of blocking them.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuidLike = (value) =>
  typeof value === 'string' && UUID_PATTERN.test(value.trim());

export const getItemId = (item) => {
  if (!item) return null;
  const value = item._id || item.id || item.productId || null;
  return value == null || value === '' ? null : String(value);
};

export const getShopIdValue = (item) => {
  if (!item) return null;
  const shop = item.shopId ?? item.shop;
  const value =
    (shop && typeof shop === 'object' ? shop._id || shop.id : shop) || item.shop_id || null;
  return value == null || value === '' ? null : String(value);
};

export const getShopNameValue = (item, fallback = 'Local Shop') => {
  const shop = item?.shopId ?? item?.shop;
  return (
    (shop && typeof shop === 'object' ? shop.shopName || shop.shop_name : null) ||
    item?.shopName ||
    fallback
  );
};

// The only listings that are knowingly *not* backed by a database shop record.
const DEMO_ID_PREFIXES = ['sehore-item-', 'sehore-demo-'];

export const isDemoCatalogue = (item) => {
  if (!item) return false;
  if (item.isDemoCatalogue === true || item.isDemo === true) return true;
  return [getItemId(item), getShopIdValue(item)].some(
    (value) =>
      value != null && DEMO_ID_PREFIXES.some((prefix) => value.toLowerCase().startsWith(prefix))
  );
};

// Demo listings are holdable: they are routed to a linked live partner shop
// (Sharma fallback UUID) instead of being blocked. The UI + backend keep the
// original demo shop name in `demoShopName` so the shopkeeper still knows
// which storefront the customer was browsing.
export const DEMO_FALLBACK_SHOP_ID = 'b0000000-0000-0000-0000-000000000001';
export const DEMO_FALLBACK_SHOP_NAME = 'Sharma Hardware & Daily Essentials Store';

export const isDemoRouted = (item) => isDemoCatalogue(item);

export const getRoutedShopId = (item) => {
  const raw = getShopIdValue(item);
  if (raw && isUuidLike(raw)) return raw;
  if (isDemoCatalogue(item)) return DEMO_FALLBACK_SHOP_ID;
  return raw;
};

export const getRoutedShopName = (item) => {
  const live = getShopNameValue(item, null);
  if (live) return live;
  if (isDemoCatalogue(item)) return getShopNameValue(item, DEMO_FALLBACK_SHOP_NAME);
  return 'Local Shop';
};

export const getRoutedProductId = (item) => {
  if (!item) return null;
  if (item.requestId) return null;
  const raw = getItemId(item);
  // Demo slugs are not UUIDs — the DB column is nullable, so send null and
  // keep the human name in productName instead of failing validation.
  if (raw && !isUuidLike(raw)) return null;
  return raw;
};

// Returns a finite number, or null when the listing genuinely does not publish
// a stock quantity (null must never be treated as "0 in stock").
export const getStockQuantity = (item) => {
  if (!item) return null;
  const raw =
    item.quantityInStock ?? item.quantity_in_stock ?? item.stockQuantity ?? item.stock ?? null;
  if (raw === null || raw === undefined || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};

export const getPriceValue = (item) => {
  if (!item) return null;
  const raw = item.price ?? item.offeredPrice ?? item.offered_price ?? null;
  if (raw === null || raw === undefined || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};

export const isItemAvailable = (item) => {
  if (!item) return false;
  const availability = item.isAvailable ?? item.is_available;
  if (availability === false) return false;
  const stock = getStockQuantity(item);
  return stock === null ? true : stock > 0;
};

// The hold durations the reservation API actually understands.
export const HOLD_DURATION_OPTIONS = [
  { value: 30, label: '30 Minutes' },
  { value: 60, label: '60 Minutes (Standard)' },
  { value: 120, label: '2 Hours' },
];

export const getHoldDurationValue = (value) => {
  const numeric = Number(value);
  return HOLD_DURATION_OPTIONS.some((option) => option.value === numeric) ? numeric : 60;
};


/**
 * Canonical shop-inventory product, so raw Supabase rows and API rows render
 * identically (raw rows use snake_case and carry no nested shop object).
 */
export const normalizeInventoryProduct = (product, fallbackShop = null) => {
  const images = Array.isArray(product?.images)
    ? product.images
    : product?.image_url
    ? [product.image_url]
    : [];
  const shop = product?.shopId || product?.shop || fallbackShop || null;
  const stock = getStockQuantity(product);
  return {
    ...product,
    _id: getItemId(product),
    name: product?.name || product?.product_name || 'Unnamed item',
    brand: product?.brand || 'Unbranded',
    category: product?.category || 'Uncategorised',
    price: getPriceValue(product),
    mrp: Number.isFinite(Number(product?.mrp)) ? Number(product.mrp) : null,
    unit: product?.unit || 'piece',
    quantityInStock: stock,
    isAvailable: (product?.isAvailable ?? product?.is_available) !== false,
    stockStatus:
      product?.stockStatus ||
      product?.stock_status ||
      (stock === null ? undefined : stock > 3 ? 'in_stock' : stock > 0 ? 'low_stock' : 'out_of_stock'),
    images,
    shopId: shop,
    shopName: getShopNameValue({ shopId: shop }, 'Local Shop'),
  };
};

/**
 * Can this listing honestly be turned into an in-store hold?
 * status: 'ready' | 'demo-routed' | 'unlinked' | 'no-price' | 'out-of-stock'
 * Demo-catalogue rows are `demo-routed`: holdable, fulfilled by the linked
 * live partner shop. Everything else keeps the strict UUID rules.
 */
export const getReservationReadiness = (item) => {
  if (!item) {
    return { status: 'unlinked', canReserve: false, message: 'No product was selected.' };
  }

  const demoRouted = isDemoCatalogue(item);

  const shopIdValue = getRoutedShopId(item);
  if (!shopIdValue || !isUuidLike(shopIdValue)) {
    return {
      status: 'unlinked',
      canReserve: false,
      message: shopIdValue
        ? 'This listing is not linked to a verified live shop record in the database, so an in-store hold cannot be created for it.'
        : 'This listing is not linked to any shop record, so a hold cannot be created. Open it from a shop page or ask the shop for a quote.',
    };
  }

  if (getPriceValue(item) === null) {
    return {
      status: 'no-price',
      canReserve: false,
      message:
        'This listing has no price, so the hold total cannot be calculated. Ask the shop for a quote instead.',
    };
  }

  if (!isItemAvailable(item)) {
    return {
      status: 'out-of-stock',
      canReserve: false,
      message: 'This item is currently out of stock at the shop, so it cannot be held.',
    };
  }

  if (demoRouted) {
    return {
      status: 'demo-routed',
      canReserve: true,
      isDemoRouted: true,
      message: '',
    };
  }

  return { status: 'ready', canReserve: true, message: '' };
};
