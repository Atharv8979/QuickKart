// -----------------------------------------------------------------------------
// Google Maps / GPS helpers shared by registration & profile screens.
// -----------------------------------------------------------------------------

// Builds a Google Maps "Get Direction" URL for a shop address/coordinates.
// Prefers precise lat/lng when available, otherwise falls back to the free-text
// address so Google Maps can resolve it server-side.
export const buildDirectionsUrl = ({ lat, lng, address } = {}) => {
  if (typeof lat === 'number' && typeof lng === 'number' && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
  const query = String(address || '').trim();
  if (!query) return 'https://www.google.com/maps';
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
};

// Builds a Google Maps search URL (used for the live "view on map" preview).
export const buildSearchUrl = ({ lat, lng, address } = {}) => {
  if (typeof lat === 'number' && typeof lng === 'number' && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  const query = String(address || '').trim();
  if (!query) return 'https://www.google.com/maps';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

// Best-effort reverse geocode of GPS coordinates into a readable address using
// the free Nominatim service (OpenStreetMap). Never throws — resolves to an
// empty object on failure so callers can keep whatever the user typed.
export const reverseGeocode = async (lat, lng) => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) return {};
    const data = await res.json();
    const a = data?.address || {};
    return {
      street: [a.house_number, a.road, a.neighbourhood || a.suburb || a.quarter]
        .filter(Boolean)
        .join(' ') || '',
      area: a.village || a.town || a.city_district || a.suburb || '',
      city: a.city || a.town || a.village || a.county || '',
      state: a.state || '',
      pincode: a.postcode || '',
      country: a.country || '',
      formatted: data?.display_name || '',
    };
  } catch {
    return {};
  }
};

// One-shot GPS fix + reverse geocode. Resolves { lat, lng, ...addressFields }.
export const getCurrentPositionAddress = (options = {}) =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const geo = await reverseGeocode(latitude, longitude);
        resolve({ lat: latitude, lng: longitude, ...geo });
      },
      (err) => reject(err),
      { timeout: 10000, enableHighAccuracy: true, ...options }
    );
  });
