import { Router } from 'express';
import { listUsers, createUser, getUser, updateUser, deleteUser } from '../controllers/user';
import { auth, requireRole } from '../middleware/auth';

const router = Router();

router.use(auth, requireRole(['admin']));

router.get('/', listUsers);
router.post('/', createUser);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
