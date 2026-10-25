import { Router } from 'express';
import {
  getPets,
  getAllPetsForAdmin,
  getMyListings,
  getPet,
  createPet,
  updatePet,
  reviewPet,
  deletePet,
} from '../controllers/petController.js';
import { protect, authorize, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { upload } from '../middleware/upload.js';
import { petSchemaFor, reviewSchema } from '../validators/petSchemas.js';

const router = Router();

// Public search (approved listings only)
router.get('/', getPets);

// Fixed paths must come BEFORE '/:id', or Express would treat "mine" as an id.
router.get('/mine', protect, getMyListings);
router.get('/manage', protect, authorize('admin'), getAllPetsForAdmin);

// optionalAuth lets owners and admins open listings that are still in review.
router.get('/:id', optionalAuth, getPet);

// Any logged in user can list a pet. upload.array('photos', 5) reads up to 5 images
// BEFORE validate, because Multer is what fills req.body for multipart forms.
router.post('/', protect, upload.array('photos', 5), validate(petSchemaFor), createPet);
router.put('/:id', protect, upload.array('photos', 5), validate(petSchemaFor), updatePet);
router.delete('/:id', protect, deletePet);

// Moderation (admin only)
router.patch('/:id/review', protect, authorize('admin'), validate(reviewSchema), reviewPet);

export default router;
