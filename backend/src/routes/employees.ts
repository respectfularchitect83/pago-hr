import { Router } from 'express';
import { auth, requireRole } from '../middleware/auth';
import * as employeeController from '../controllers/employee';

const router = Router();

// Employee management routes (HR/Admin only)
router.get('/', auth, requireRole(['admin', 'hr']), employeeController.listEmployees);
router.post('/', auth, requireRole(['admin', 'hr']), employeeController.createEmployee);
router.get('/self', auth, employeeController.getSelfProfile);
router.get('/:id', auth, employeeController.getEmployee);
router.put('/:id', auth, requireRole(['admin', 'hr']), employeeController.updateEmployee);
router.delete('/:id', auth, requireRole(['admin']), employeeController.deleteEmployee);

export default router;