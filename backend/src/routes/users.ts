import { Router } from 'express';
import { listUsers, createUser, getUser, updateUser, deleteUser } from '../controllers/user';
import { auth, requireRole } from '../middleware/auth';

const router = Router();

router.use(auth);

router.get('/', requireRole(['admin', 'hr']), listUsers);
router.post('/', requireRole(['admin']), createUser);
router.get('/:id', requireRole(['admin', 'hr']), getUser);
router.put('/:id', requireRole(['admin']), updateUser);
router.delete('/:id', requireRole(['admin', 'hr']), deleteUser);

export default router;
