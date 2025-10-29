import { Router } from 'express';
import { auth, requireRole } from '../middleware/auth';
import * as leaveController from '../controllers/leave';

const router = Router();

// Leave management routes
router.get('/', auth, leaveController.listLeaveRequests);
router.post('/', auth, leaveController.createLeaveRequest);
router.get('/balance', auth, leaveController.getLeaveBalance);
router.get('/:id', auth, leaveController.getLeaveRequest);
router.put('/:id', auth, requireRole(['admin', 'hr']), leaveController.updateLeaveRequest);
router.post('/:id/approve', auth, requireRole(['admin', 'hr']), leaveController.approveLeaveRequest);
router.post('/:id/reject', auth, requireRole(['admin', 'hr']), leaveController.rejectLeaveRequest);

export default router;