import { Router } from 'express';
import { registerTenant } from '../controllers/tenant';

const router = Router();

router.post('/register', registerTenant);

export default router;
