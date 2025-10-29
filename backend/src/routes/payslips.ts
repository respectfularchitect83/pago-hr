import { Router } from 'express';
import { auth, requireRole } from '../middleware/auth';
import * as payslipController from '../controllers/payslip';

const router = Router();

// Payslip routes
router.get('/', auth, payslipController.listPayslips);
router.post('/', auth, requireRole(['admin', 'hr']), payslipController.createPayslip);
router.get('/:id', auth, payslipController.getPayslip);
router.put('/:id', auth, requireRole(['admin', 'hr']), payslipController.updatePayslip);
router.post('/:id/publish', auth, requireRole(['admin', 'hr']), payslipController.publishPayslip);
router.get('/:id/download', auth, payslipController.downloadPayslip);

export default router;