import express from 'express';
import {
  createRequest,
  getMyRequests,
  getRequestDetails,
  getShopRelevantRequests,
  respondToRequest,
  respondToBargain,
  bargainRequest,
  acceptRequest,
  rejectRequest,
  confirmBargainDeal,
} from '../controllers/requestController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = express.Router();

router.post('/', protect, authorize('customer'), createRequest);
router.get('/my', protect, authorize('customer'), getMyRequests);
router.get('/shop', protect, authorize('shopkeeper'), getShopRelevantRequests);
router.post('/:id/respond', protect, authorize('shopkeeper'), respondToRequest);
router.post('/:id/bargain', protect, authorize('shopkeeper'), bargainRequest);
router.post('/:id/customer-respond', protect, authorize('customer'), respondToBargain);
router.post('/:id/accept', protect, authorize('shopkeeper'), acceptRequest);
router.post('/:id/reject', protect, authorize('shopkeeper'), rejectRequest);
router.post('/:id/confirm-deal', protect, authorize('shopkeeper'), confirmBargainDeal);
router.get('/:id', getRequestDetails);

export default router;
