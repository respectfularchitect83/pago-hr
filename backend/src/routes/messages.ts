import { Router } from 'express';
import { auth, requireRole } from '../middleware/auth';
import * as messageController from '../controllers/message';

const router = Router();

router.get('/', auth, messageController.listMessages);
router.post('/', auth, messageController.createMessage);
router.patch('/:id/status', auth, messageController.updateMessageStatus);
router.delete('/:id', auth, requireRole(['admin', 'hr']), messageController.deleteMessage);

export default router;
