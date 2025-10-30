import { Router } from 'express';
import { auth, requireRole } from '../middleware/auth';
import { getCompanySettings, updateCompanySettings } from '../controllers/company';

const router = Router();

router.get('/', auth, requireRole(['admin', 'hr']), getCompanySettings);
router.put('/', auth, requireRole(['admin', 'hr']), updateCompanySettings);

export default router;
