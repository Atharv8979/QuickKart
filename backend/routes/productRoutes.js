import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = express.Router();

router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', protect, authorize('shopkeeper'), createProduct);
router.put('/:id', protect, authorize('shopkeeper'), updateProduct);
router.delete('/:id', protect, authorize('shopkeeper'), deleteProduct);

export default router;
