import express from 'express';
import {
  getNearbyShops,
  getShopById,
  registerShop,
  getMyShop,
  updateMyShop,
  updateLiveBusinessState,
  getRegionalRanking,
} from '../controllers/shopController.js';
import { protect, optionalProtect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = express.Router();

router.get('/', getNearbyShops);
router.get('/nearby', getNearbyShops);
// optionalProtect: populates req.user when a token is present so a logged-in
// shopkeeper is benchmarked against THEIR OWN shop — never the demo default.
router.get('/regional-ranking', optionalProtect, getRegionalRanking);
// NOTE: this router is mounted at /api/shops — paths here are relative to it,
// so '/my-shop' (NOT '/shops/my-shop') is what maps to GET /api/shops/my-shop.
// Anything else falls through to the '/:id' catch-all (getShopById), which in
// fallback mode returns FALLBACK_SHOPS[0] — the demo Sharma shop.
router.get('/my-shop', protect, authorize('shopkeeper'), getMyShop);
router.put('/my-shop', protect, authorize('shopkeeper'), updateMyShop);
router.put('/live-state', protect, authorize('shopkeeper'), updateLiveBusinessState);
router.post('/', protect, registerShop);
router.get('/:id', getShopById);

export default router;
