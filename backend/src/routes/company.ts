import { Router } from 'express';
import { auth, requireRole } from '../middleware/auth';
import { getCompanyPublicInfo, getCompanySettings, updateCompanySettings } from '../controllers/company';

const router = Router();

router.get('/public-info', getCompanyPublicInfo);
router.get('/', auth, requireRole(['admin', 'hr', 'employee']), getCompanySettings);
router.put('/', auth, requireRole(['admin', 'hr']), updateCompanySettings);

export default router;
