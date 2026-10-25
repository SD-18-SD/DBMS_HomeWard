import Campaign, { CAMPAIGN_CATEGORIES, MAX_CAMPAIGN_PHOTOS } from '../models/Campaign.js';
import Donation from '../models/Donation.js';
import Pet from '../models/Pet.js';
import AppError from '../utils/AppError.js';
import { isOwnerOrAdmin } from '../middleware/auth.js';
import { filesToPaths, mergePhotos, removeUploads } from '../middleware/upload.js';

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Statuses anyone can see. pending_review and rejected are only for the owner and admins.
const PUBLIC_STATUSES = ['active', 'paused', 'closed'];

// Which admin action is allowed from which status.
const ALLOWED_MOVES = {
  pending_review: ['active', 'rejected', 'closed'],
  active: ['paused', 'closed'],
  paused: ['active', 'closed'],
  rejected: ['active', 'closed'],
  closed: ['active'],
};

// Makes sure a linked pet exists. Returns its id or null.
async function checkPet(petId) {
  if (!petId) return null;
  const pet = await Pet.findById(petId);
  if (!pet) throw new AppError('The linked pet does not exist', 400);
  return pet._id;
}

// Shows "Anonymous" instead of the name when the donor asked for it.
function publicDonation(d) {
  return {
    _id: d._id,
    amount: d.amount,
    message: d.message,
    createdAt: d.createdAt,
    donorName: d.isAnonymous || !d.donorName ? 'Anonymous' : d.donorName,
  };
}

// GET /api/campaigns?status=active|closed&category=&q=&page=
export async function listCampaigns(req, res) {
  const status = req.query.status === 'closed' ? 'closed' : 'active';
  const filter = { status };
  if (CAMPAIGN_CATEGORIES.includes(req.query.category)) filter.category = req.query.category;
  if (req.query.q) filter.title = { $regex: escapeRegex(String(req.query.q)), $options: 'i' };

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
  const [campaigns, total] = await Promise.all([
    Campaign.find(filter)
      .populate('pet', 'name species photos')
      .sort({ endDate: 1 }) // ending soonest first
      .skip((page - 1) * limit)
      .limit(limit),
    Campaign.countDocuments(filter),
  ]);
  res.json({ campaigns, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}

// GET /api/campaigns/manage?status=  (admin) every campaign
export async function listAllCampaigns(req, res) {
  const filter = {};
  if (req.query.status && ALLOWED_MOVES[req.query.status]) filter.status = req.query.status;
  const campaigns = await Campaign.find(filter)
    .populate('createdBy', 'name email')
    .populate('pet', 'name')
    .sort({ createdAt: -1 });
  res.json({ campaigns });
}

// GET /api/campaigns/mine  (logged in) campaigns I created
export async function getMyCampaigns(req, res) {
  const campaigns = await Campaign.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
  res.json({ campaigns });
}

// GET /api/campaigns/:id  campaign + the 20 latest donations
export async function getCampaign(req, res) {
  const campaign = await Campaign.findById(req.params.id)
    .populate('pet', 'name species photos reviewStatus')
    .populate('createdBy', 'name role');
  if (!campaign) throw new AppError('Campaign not found', 404);
  if (!PUBLIC_STATUSES.includes(campaign.status) && !isOwnerOrAdmin(req.user, campaign)) {
    throw new AppError('Campaign not found', 404);
  }

  const donations = await Donation.find({ campaign: campaign._id }).sort({ createdAt: -1 }).limit(20);
  res.json({ campaign, donations: donations.map(publicDonation) });
}

// POST /api/campaigns  (logged in, multipart with up to 5 "photos")
export async function createCampaign(req, res) {
  const { keepPhotos, pet, ...data } = req.body;
  const campaign = await Campaign.create({
    ...data,
    pet: await checkPet(pet),
    photos: filesToPaths(req.files),
    createdBy: req.user._id,
    // Admin campaigns go live at once. User campaigns wait for an admin.
    status: req.user.role === 'admin' ? 'active' : 'pending_review',
  });
  res.status(201).json({ campaign });
}

// PUT /api/campaigns/:id  (owner or admin)
export async function updateCampaign(req, res) {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) throw new AppError('Campaign not found', 404);
  if (!isOwnerOrAdmin(req.user, campaign)) throw new AppError('You can only edit your own campaigns', 403);
  if (campaign.status === 'closed') throw new AppError('Closed campaigns cannot be edited', 400);

  const { keepPhotos, pet, ...data } = req.body;
  const { photos, removed } = mergePhotos({
    current: campaign.photos,
    keep: keepPhotos,
    added: filesToPaths(req.files),
    max: MAX_CAMPAIGN_PHOTOS,
  });

  campaign.set({ ...data, pet: await checkPet(pet), photos });
  // A rejected campaign that the owner fixes goes back to the review queue.
  if (req.user.role !== 'admin' && campaign.status === 'rejected') {
    campaign.status = 'pending_review';
    campaign.reviewNote = '';
  }
  await campaign.save();
  removeUploads(removed);
  res.json({ campaign });
}

// PATCH /api/campaigns/:id/status  (admin) approve, reject, pause, resume, close
export async function setCampaignStatus(req, res) {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) throw new AppError('Campaign not found', 404);

  const { status, reviewNote } = req.body;
  if (!ALLOWED_MOVES[campaign.status].includes(status)) {
    throw new AppError(`A ${campaign.status.replace('_', ' ')} campaign cannot be set to ${status}`, 400);
  }
  campaign.status = status;
  if (reviewNote) campaign.reviewNote = reviewNote;
  await campaign.save();
  res.json({ campaign });
}

// DELETE /api/campaigns/:id
// Admins can remove any campaign. Owners only while nobody has donated.
// Donations are kept so donors still see them in their history.
export async function deleteCampaign(req, res) {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) throw new AppError('Campaign not found', 404);
  if (!isOwnerOrAdmin(req.user, campaign)) throw new AppError('Not allowed', 403);
  if (req.user.role !== 'admin' && campaign.raisedAmount > 0) {
    throw new AppError('This campaign already has donations. Ask an admin to close it.', 400);
  }
  await campaign.deleteOne();
  removeUploads(campaign.photos);
  res.json({ message: 'Campaign removed' });
}

// POST /api/campaigns/:id/donations  (anyone; logged in users get it in their history)
export async function donate(req, res) {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) throw new AppError('Campaign not found', 404);
  if (campaign.status !== 'active') throw new AppError('This campaign is not accepting donations', 400);
  if (campaign.isEnded) throw new AppError('This campaign has ended', 400);

  const { amount, isAnonymous, donorName, message } = req.body;
  const user = req.user;

  // Count each logged in person once. Every guest donation counts as a new donor.
  const isRepeatDonor = user ? await Donation.exists({ campaign: campaign._id, user: user._id }) : false;

  const donation = await Donation.create({
    campaign: campaign._id,
    user: user?._id ?? null,
    donorName: user ? user.name : donorName,
    isAnonymous: user ? isAnonymous : isAnonymous || !donorName,
    amount,
    message,
  });

  // $inc adds to the number inside the database in one step, so two donations
  // at the same moment cannot overwrite each other.
  const updated = await Campaign.findByIdAndUpdate(
    campaign._id,
    { $inc: { raisedAmount: amount, donorCount: isRepeatDonor ? 0 : 1 } },
    { returnDocument: 'after' }
  );

  res.status(201).json({ donation: publicDonation(donation), campaign: updated });
}

// GET /api/campaigns/donations/mine  (logged in) my donation history
export async function getMyDonations(req, res) {
  const donations = await Donation.find({ user: req.user._id })
    .populate('campaign', 'title photos status')
    .sort({ createdAt: -1 });
  const total = donations.reduce((sum, d) => sum + d.amount, 0);
  res.json({ donations, total });
}
