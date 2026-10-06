import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { MAX_COMPARE_ITEMS } from './compareUtils';

// Safe no-op default so ProductCard and other consumers never crash even if
// they are rendered somewhere without a CompareProvider above them.
const noopDefault = {
  compareItems: [],
  compareCount: 0,
  isFull: false,
  maxCompareItems: MAX_COMPARE_ITEMS,
  isInCompare: () => false,
  toggleCompare: () => {},
  removeCompareItem: () => {},
  clearCompare: () => {},
};

const CompareContext = createContext(noopDefault);

// One localStorage bucket per signed-in account (plus one for guests), so a
// newly registered user always starts with an empty compare list and an
// account switch can never reveal another user's saved items.
const STORAGE_KEY_PREFIX = 'quickkart_compare_items';
// The pre-isolation key was shared by every account on the device; it is
// purged when the provider loads so old shared data can never be read again.
const LEGACY_SHARED_KEY = STORAGE_KEY_PREFIX;

const storageKeyFor = (userId) =>
  userId ? `${STORAGE_KEY_PREFIX}_${userId}` : `${STORAGE_KEY_PREFIX}_guest`;

const readStoredItems = (key) => {
  try {
    const saved = localStorage.getItem(key);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_COMPARE_ITEMS) : [];
  } catch (err) {
    console.warn('Could not restore comparison list:', err);
    return [];
  }
};

const offerKey = (offer) => offer?._id || offer?.id || null;

export const CompareProvider = ({ children }) => {
  const { addToast } = useNotification();
  const auth = useAuth() || {};
  const userId = auth.user?.id || auth.user?._id || null;

  // The bucket key always travels together with its items, so persistence can
  // never write one account's list into another account's storage slot.
  const [bucket, setBucket] = useState(() => {
    const key = storageKeyFor(userId);
    return { key, items: readStoredItems(key) };
  });

  // Swap to the new account's bucket whenever the signed-in user changes
  // (login, logout or in-place account switch while the provider stays mounted).
  useEffect(() => {
    const key = storageKeyFor(userId);
    setBucket((prev) => (prev.key === key ? prev : { key, items: readStoredItems(key) }));
    localStorage.removeItem(LEGACY_SHARED_KEY);
  }, [userId]);

  useEffect(() => {
    try {
      localStorage.setItem(bucket.key, JSON.stringify(bucket.items));
    } catch (err) {
      console.warn('Could not persist comparison list:', err);
    }
  }, [bucket]);

  const compareItems = bucket.items;
  const setCompareItems = useCallback(
    (next) =>
      setBucket((prev) => ({
        ...prev,
        items: typeof next === 'function' ? next(prev.items) : next,
      })),
    []
  );

  // One product row belongs to exactly one shop, so the product id doubles as
  // the product-shop combination key — this prevents duplicate entries.
  const isInCompare = useCallback(
    (productId) => compareItems.some((item) => offerKey(item) === productId),
    [compareItems]
  );

  const toggleCompare = useCallback(
    (product) => {
      const key = offerKey(product);
      if (!key) return;
      if (isInCompare(key)) {
        setCompareItems((prev) => prev.filter((item) => offerKey(item) !== key));
        return;
      }
      if (compareItems.length >= MAX_COMPARE_ITEMS) {
        addToast(
          `You can compare up to ${MAX_COMPARE_ITEMS} offers. Remove one from the Compare tab first.`,
          'info'
        );
        return;
      }
      setCompareItems((prev) => [...prev, product]);
    },
    [compareItems.length, isInCompare, addToast]
  );

  const removeCompareItem = useCallback((productId) => {
    setCompareItems((prev) => prev.filter((item) => offerKey(item) !== productId));
  }, []);

  const clearCompare = useCallback(() => setCompareItems([]), []);

  return (
    <CompareContext.Provider
      value={{
        compareItems,
        compareCount: compareItems.length,
        isFull: compareItems.length >= MAX_COMPARE_ITEMS,
        maxCompareItems: MAX_COMPARE_ITEMS,
        isInCompare,
        toggleCompare,
        removeCompareItem,
        clearCompare,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
};

export const useCompare = () => useContext(CompareContext);
