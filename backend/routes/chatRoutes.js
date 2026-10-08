import express from 'express';
import multer from 'multer';
import {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  uploadChatImage,
  getNotifications,
  markNotificationsRead,
} from '../controllers/chatController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(protect);

router.get('/conversations', getConversations);
router.post('/conversations', getOrCreateConversation);
router.get('/conversations/:id/messages', getMessages);
router.post('/conversations/:id/messages', sendMessage);

router.post('/upload-image', upload.single('image'), uploadChatImage);

router.get('/notifications', getNotifications);
router.put('/notifications/read-all', markNotificationsRead);

export default router;
