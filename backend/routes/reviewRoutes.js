import express from 'express';
import { createReview, updateReview, deleteReview, getShopReviews, getMyReviews } from '../controllers/reviewController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = express.Router();

router.post('/', protect, authorize('customer'), createReview);
router.put('/:id', protect, authorize('customer'), updateReview);
router.delete('/:id', protect, authorize('customer'), deleteReview);
router.get('/shop/:shopId', getShopReviews);
router.get('/my', protect, authorize('customer'), getMyReviews);

export default router;
