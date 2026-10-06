const imageByCategory = {
  plumbing: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=500&q=80',
  hardware: 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=500&q=80',
  electrical: 'https://images.unsplash.com/photo-1555963966-b7ae5404b6ed?auto=format&fit=crop&w=500&q=80',
  grocery: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80',
  medicine: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=500&q=80',
  stationery: 'https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?auto=format&fit=crop&w=500&q=80',
  electronics: 'https://images.unsplash.com/photo-1511707171634-5f00e5a94b69?auto=format&fit=crop&w=500&q=80',
};

// Distances are measured from the demo anchor:
// VIT Bhopal University, Kothri Kalan (23.0755 N, 76.8498 E) — verified via OpenStreetMap.
const shops = [
  {
    _id: 'sehore-demo-001', shopName: 'Kothri Kalan Kirana & General Store', category: 'Groceries & Daily Essentials',
    tagline: 'Daily essentials next to the VIT Bhopal campus',
    landmark: 'Kothri Kalan village market, 10 min from VIT Bhopal',
    contactPhone: '+91 90000 00001',
    address: { street: 'Main Village Road, Kothri Kalan', area: 'Kothri Kalan', city: 'Kothri Kalan, Sehore', state: 'Madhya Pradesh', pincode: '466114' },
    location: { coordinates: [76.8298, 23.074] }, distanceKm: 2.1, rating: 4.6, reviewCount: 84,
    isActive: true, verificationStatus: 'verified', deliveryAvailable: true, deliveryEtaMinutes: 25,
    openingHours: { isOpenNow: true, open: '06:30 AM', close: '09:30 PM' },
  },
  {
    _id: 'sehore-demo-002', shopName: 'Ashta Hardware & Sanitation Mart', category: 'Hardware & Tools',
    tagline: 'Tools, paints and sanitary fittings in Ashta Main Market',
    landmark: 'Main Market, near Ashta town square',
    contactPhone: '+91 90000 00002',
    address: { street: 'Main Market, Near Town Square', area: 'Ashta', city: 'Ashta, Sehore', state: 'Madhya Pradesh', pincode: '466116' },
    location: { coordinates: [76.7222, 23.0195] }, distanceKm: 14.5, rating: 4.4, reviewCount: 61,
    isActive: true, verificationStatus: 'verified', deliveryAvailable: false, deliveryEtaMinutes: null,
    openingHours: { isOpenNow: true, open: '09:00 AM', close: '09:00 PM' },
  },
  {
    _id: 'sehore-demo-003', shopName: 'Ashta Electrical & Farm Centre', category: 'Electrical & Lighting',
    tagline: 'Wires, pumps and lighting for farms and homes',
    landmark: 'Krishi Mandi Road, Ashta',
    contactPhone: '+91 90000 00003',
    address: { street: 'Krishi Mandi Road, Ashta', area: 'Ashta', city: 'Ashta, Sehore', state: 'Madhya Pradesh', pincode: '466116' },
    location: { coordinates: [76.715, 23.018] }, distanceKm: 15.2, rating: 4.3, reviewCount: 47,
    isActive: true, verificationStatus: 'verified', deliveryAvailable: true, deliveryEtaMinutes: 70,
    openingHours: { isOpenNow: true, open: '08:30 AM', close: '08:30 PM' },
  },
  {
    _id: 'sehore-demo-004', shopName: 'Ashta Civil Medical Store', category: 'Medicines & Wellness',
    tagline: 'Medicines and wellness essentials opposite Civil Hospital Ashta',
    landmark: 'SH-70, opposite Civil Hospital Ashta',
    contactPhone: '+91 90000 00004',
    address: { street: 'SH-70, Opposite Civil Hospital Ashta', area: 'Ashta', city: 'Ashta, Sehore', state: 'Madhya Pradesh', pincode: '466116' },
    location: { coordinates: [76.7245, 23.0227] }, distanceKm: 14.1, rating: 4.8, reviewCount: 126,
    isActive: true, verificationStatus: 'verified', deliveryAvailable: true, deliveryEtaMinutes: 45,
    openingHours: { isOpenNow: true, open: '07:00 AM', close: '11:00 PM' },
  },
  {
    _id: 'sehore-demo-005', shopName: 'Bairagarh Electronics & Mobile Hub', category: 'Electronics & Mobiles',
    tagline: 'Gadgets, chargers and accessories in Bairagarh, Bhopal',
    landmark: 'Bairagarh Main Road, Bhopal',
    contactPhone: '+91 90000 00005',
    address: { street: 'Bairagarh Main Road, Near Bus Stop', area: 'Bairagarh', city: 'Bhopal', state: 'Madhya Pradesh', pincode: '462030' },
    location: { coordinates: [77.3366, 23.2745] }, distanceKm: 54.6, rating: 4.5, reviewCount: 92,
    isActive: true, verificationStatus: 'verified', deliveryAvailable: true, deliveryEtaMinutes: 90,
    openingHours: { isOpenNow: true, open: '10:00 AM', close: '09:30 PM' },
  },
  {
    _id: 'sehore-demo-006', shopName: 'New Market Books & Stationery Corner', category: 'Stationery & Office',
    tagline: 'Books, notebooks and office supplies at New Market Bhopal',
    landmark: 'New Market, TT Nagar, Bhopal',
    contactPhone: '+91 90000 00006',
    address: { street: 'New Market, TT Nagar', area: 'New Market', city: 'Bhopal', state: 'Madhya Pradesh', pincode: '462001' },
    location: { coordinates: [77.4003, 23.2352] }, distanceKm: 59.1, rating: 4.7, reviewCount: 73,
    isActive: true, verificationStatus: 'verified', deliveryAvailable: false, deliveryEtaMinutes: null,
    openingHours: { isOpenNow: true, open: '10:30 AM', close: '09:00 PM' },
  },
];

const product = (id, name, brand, category, price, mrp, unit, stock, shop, imageKey, stockStatus = 'in_stock') => ({
  _id: `sehore-item-${id}`, id: `sehore-item-${id}`, name, brand, category, price, mrp, unit,
  quantityInStock: stock, lowStockThreshold: stockStatus === 'low_stock' ? 8 : 4,
  isAvailable: stockStatus !== 'out_of_stock', stockStatus, images: [imageByCategory[imageKey]],
  shopId: shop, rating: shop.rating, reviewCount: shop.reviewCount,
  deliveryAvailable: shop.deliveryAvailable, deliveryEtaMinutes: shop.deliveryEtaMinutes,
  // Explicit marker so every customer component can label this row as demo
  // content instead of presenting it as a live database listing.
  isDemo: true,
});

const products = [
  // Kothri Kalan Kirana & General Store (nearest to VIT Bhopal campus)
  product('atta', 'Shudh Chakki Atta 5kg', 'Aashirvaad', 'Groceries & Daily Essentials', 245, 275, 'bag', 60, shops[0], 'grocery'),
  product('rice', 'Everyday Basmati Rice 5kg', 'India Gate', 'Groceries & Daily Essentials', 365, 420, 'bag', 2, shops[0], 'grocery', 'low_stock'),
  product('oil', 'Sunflower Refined Oil 1L', 'Fortune', 'Groceries & Daily Essentials', 145, 160, 'bottle', 40, shops[0], 'grocery'),
  product('salt', 'Iodised Salt 1kg', 'Tata', 'Groceries & Daily Essentials', 24, 28, 'pack', 80, shops[0], 'grocery'),
  product('tea', 'Red Label Tea 500g', 'Brooke Bond', 'Groceries & Daily Essentials', 265, 310, 'pack', 22, shops[0], 'grocery'),
  product('detergent', 'Easy Wash Detergent 1kg', 'Surf Excel', 'Groceries & Daily Essentials', 120, 145, 'pack', 26, shops[0], 'grocery'),
  product('biscuit', 'Family Pack Biscuits 800g', 'Parle', 'Groceries & Daily Essentials', 35, 40, 'pack', 90, shops[0], 'grocery'),
  product('dal', 'Toor Dal 1kg', 'Tata Sampann', 'Groceries & Daily Essentials', 175, 205, 'pack', 4, shops[0], 'grocery', 'low_stock'),


  // Ashta Hardware & Sanitation Mart
  product('pipe', 'PVC Pipe 1 inch (10ft)', 'Finolex', 'Plumbing & Sanitary', 290, 350, 'piece', 45, shops[1], 'plumbing'),
  product('valve', 'Brass Angle Valve with Flange', 'Jaquar', 'Plumbing & Sanitary', 480, 575, 'piece', 5, shops[1], 'plumbing', 'low_stock'),
  product('drill', '500W Impact Drill Kit', 'Bosch', 'Hardware & Tools', 2850, 3499, 'kit', 20, shops[1], 'hardware'),
  product('paint', 'Apex Exterior Emulsion 4L', 'Asian Paints', 'Hardware & Tools', 980, 1150, 'can', 14, shops[1], 'hardware'),
  product('hammer', 'Steel Claw Hammer 800g', 'Taparia', 'Hardware & Tools', 340, 395, 'piece', 18, shops[1], 'hardware'),
  product('screws', 'MS Screws Assorted Pack 100pcs', 'Hettich', 'Hardware & Tools', 160, 190, 'box', 3, shops[1], 'hardware', 'low_stock'),
  product('tap', 'Long Body Brass Tap 15mm', 'Cera', 'Plumbing & Sanitary', 420, 495, 'piece', 12, shops[1], 'plumbing'),

  // Ashta Electrical & Farm Centre
  product('wire', 'Copper House Wire 90m', 'Polycab', 'Electrical & Lighting', 1840, 2100, 'coil', 3, shops[2], 'electrical', 'low_stock'),
  product('bulb', '9W LED Bulb', 'Syska', 'Electrical & Lighting', 110, 140, 'piece', 30, shops[2], 'electrical'),
  product('switch', 'Modular Switch 6A (Pack of 10)', 'Anchor', 'Electrical & Lighting', 450, 520, 'pack', 26, shops[2], 'electrical'),
  product('board', '4-Socket Extension Board with Fuse', 'GM', 'Electrical & Lighting', 320, 380, 'piece', 12, shops[2], 'electrical'),
  product('pump', '1 HP Mono Block Water Pump', 'CRI', 'Electrical & Lighting', 4850, 5600, 'unit', 2, shops[2], 'electrical', 'low_stock'),
  product('torch', 'Rechargeable LED Torch 3W', 'Philips', 'Electrical & Lighting', 285, 340, 'piece', 0, shops[2], 'electrical', 'out_of_stock'),

  // Ashta Civil Medical Store
  product('paracetamol', 'Paracetamol 500mg Tablets', 'Calpol', 'Medicines & Wellness', 28, 32, 'strip', 30, shops[3], 'medicine'),
  product('ors', 'ORS Lemon Hydration Sachets', 'Electral', 'Medicines & Wellness', 22, 25, 'box', 4, shops[3], 'medicine', 'low_stock'),
  product('cetirizine', 'Cetirizine 10mg Tablets', 'Cetcip', 'Medicines & Wellness', 19, 24, 'strip', 20, shops[3], 'medicine'),
  product('bandage', 'Elastic Crepe Bandage 10cm', 'Vissco', 'Medicines & Wellness', 145, 175, 'piece', 6, shops[3], 'medicine', 'low_stock'),
  product('thermometer', 'Digital Clinical Thermometer', 'Dr Morepen', 'Medicines & Wellness', 175, 220, 'piece', 12, shops[3], 'medicine'),
  product('antacid', 'Antacid Gel 200ml', 'Digene', 'Medicines & Wellness', 135, 150, 'bottle', 15, shops[3], 'medicine'),
  product('sanitizer', 'Hand Sanitizer 500ml', 'Dettol', 'Medicines & Wellness', 190, 225, 'bottle', 8, shops[3], 'medicine', 'low_stock'),
  product('bpmonitor', 'Digital BP Monitor', 'Omron', 'Medicines & Wellness', 2150, 2600, 'unit', 5, shops[3], 'medicine'),

  // Bairagarh Electronics & Mobile Hub (Bhopal)
  product('earphones', 'Wired Earphones with Mic', 'boAt', 'Electronics & Mobiles', 399, 599, 'piece', 35, shops[4], 'electronics'),
  product('charger', '65W Type-C Fast Charger', 'Xiaomi', 'Electronics & Mobiles', 799, 999, 'piece', 18, shops[4], 'electronics'),
  product('powerbank', '20000mAh Power Bank', 'Redmi', 'Electronics & Mobiles', 1499, 1899, 'piece', 6, shops[4], 'electronics', 'low_stock'),
  product('mouse', 'Wireless Mouse 2.4GHz', 'Logitech', 'Electronics & Mobiles', 795, 995, 'piece', 22, shops[4], 'electronics'),
  product('cable', 'Braided USB-C Cable 1m', 'boAt', 'Electronics & Mobiles', 199, 299, 'piece', 50, shops[4], 'electronics'),
  product('ledtv', '32 inch HD Ready Smart TV', 'Mi', 'Electronics & Mobiles', 12490, 14990, 'unit', 3, shops[4], 'electronics', 'low_stock'),

  // New Market Books & Stationery Corner (Bhopal)
  product('notebook', 'A4 Long Notebook 200 Pages', 'Classmate', 'Stationery & Office', 95, 120, 'book', 48, shops[5], 'stationery'),
  product('pens', 'Blue Ball Pens Pack of 10', 'Cello', 'Stationery & Office', 75, 90, 'pack', 0, shops[5], 'stationery', 'out_of_stock'),
  product('geometry', 'Geometry & Instrument Box', 'Camlin', 'Stationery & Office', 180, 220, 'box', 15, shops[5], 'stationery'),
  product('paper', 'A4 Copier Paper Ream 500 Sheets', 'BILT', 'Stationery & Office', 265, 310, 'ream', 3, shops[5], 'stationery', 'low_stock'),
  product('sticky', 'Sticky Notes Cube 3x3', '3M Post-it', 'Stationery & Office', 95, 120, 'pack', 20, shops[5], 'stationery'),
  product('marker', 'Permanent Markers Pack of 4', 'Faber-Castell', 'Stationery & Office', 130, 160, 'pack', 25, shops[5], 'stationery'),
];

// Attach live stock-preview metadata directly onto each shop so the
// "Stock preview" widgets always show real numbers for demo shops.
shops.forEach((shop) => {
  const items = products.filter((item) => (item.shopId?._id || item.shopId) === shop._id);
  shop.topProducts = items.slice(0, 4);
  shop.availableItemCount = items.filter((item) => item.isAvailable !== false).length;
  shop.lowStockItemCount = items.filter((item) => item.stockStatus === 'low_stock').length;
  // These six shops are local fixtures — flag them so the UI shows a
  // "Demo shop" chip instead of a real-business "Verified" badge.
  shop.isDemo = true;
});

export const getSehoreDemoData = () => ({ shops, products });
