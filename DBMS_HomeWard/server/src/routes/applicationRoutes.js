import { Router } from 'express';
import {
  createApplication,
  getMyApplications,
  getReceivedApplications,
  withdrawApplication,
  getAllApplications,
  updateApplicationStatus,
} from '../controllers/applicationController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { applicationSchema, statusSchema } from '../validators/applicationSchemas.js';

const router = Router();

// Every route here needs a logged in user.
router.use(protect);

router.post('/', validate(applicationSchema), createApplication);
router.get('/mine', getMyApplications);
router.get('/received', getReceivedApplications);
router.delete('/:id', withdrawApplication);

// Admins, or the person who listed the pet (checked in the controller)
router.patch('/:id/status', validate(statusSchema), updateApplicationStatus);

// Admin only
router.get('/', authorize('admin'), getAllApplications);

export default router;
