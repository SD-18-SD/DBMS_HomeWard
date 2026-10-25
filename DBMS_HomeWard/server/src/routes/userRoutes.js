import { Router } from 'express';
import {
  getFavorites,
  toggleFavorite,
  getUsers,
  updateUserRole,
  deleteUser,
} from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { roleSchema } from '../validators/applicationSchemas.js';

const router = Router();

router.use(protect);

router.get('/favorites', getFavorites);
router.post('/favorites/:petId', toggleFavorite);

// Admin only
router.get('/', authorize('admin'), getUsers);
router.patch('/:id/role', authorize('admin'), validate(roleSchema), updateUserRole);
router.delete('/:id', authorize('admin'), deleteUser);

export default router;
