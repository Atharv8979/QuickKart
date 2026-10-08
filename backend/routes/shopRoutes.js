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
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = express.Router();

router.get('/', getNearbyShops);
router.get('/nearby', getNearbyShops);
router.get('/regional-ranking', getRegionalRanking);
router.get('/my-shop', protect, authorize('shopkeeper'), getMyShop);
router.put('/my-shop', protect, authorize('shopkeeper'), updateMyShop);
router.put('/live-state', protect, authorize('shopkeeper'), updateLiveBusinessState);
router.post('/', protect, registerShop);
router.get('/:id', getShopById);

export default router;
