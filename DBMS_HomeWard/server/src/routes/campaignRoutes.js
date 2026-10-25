import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  listCampaigns,
  listAllCampaigns,
  getMyCampaigns,
  getMyDonations,
  getCampaign,
  createCampaign,
  updateCampaign,
  setCampaignStatus,
  deleteCampaign,
  donate,
} from '../controllers/campaignController.js';
import { protect, authorize, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { upload } from '../middleware/upload.js';
import { campaignSchema, campaignStatusSchema, donationSchema } from '../validators/campaignSchemas.js';

const router = Router();

// Slows down anyone spamming fake donations: 30 per 15 minutes per IP.
const donationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many donations from this device. Try again later.' },
});

// Public
router.get('/', listCampaigns);

// Fixed paths before '/:id'
router.get('/mine', protect, getMyCampaigns);
router.get('/donations/mine', protect, getMyDonations);
router.get('/manage', protect, authorize('admin'), listAllCampaigns);

router.get('/:id', optionalAuth, getCampaign);

// Any logged in user can start a campaign; admins approve it.
router.post('/', protect, upload.array('photos', 5), validate(campaignSchema), createCampaign);
router.put('/:id', protect, upload.array('photos', 5), validate(campaignSchema), updateCampaign);
router.delete('/:id', protect, deleteCampaign);

// Admin tools
router.patch('/:id/status', protect, authorize('admin'), validate(campaignStatusSchema), setCampaignStatus);

// Donations: guests allowed (anonymous), logged in users get history
router.post('/:id/donations', donationLimiter, optionalAuth, validate(donationSchema), donate);

export default router;
