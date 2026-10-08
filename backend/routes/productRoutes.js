import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';
import { protect, optionalProtect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/roleMiddleware.js';

const router = express.Router();

// optionalProtect: signed-in shopkeepers are scoped to their own shop's
// catalog inside the controller; anonymous/customers see the full feed.
router.get('/', optionalProtect, getProducts);
router.get('/:id', getProductById);
router.post('/', protect, authorize('shopkeeper'), createProduct);
router.put('/:id', protect, authorize('shopkeeper'), updateProduct);
router.delete('/:id', protect, authorize('shopkeeper'), deleteProduct);

export default router;
