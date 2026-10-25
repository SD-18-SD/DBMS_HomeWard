import Application from '../models/Application.js';
import Pet from '../models/Pet.js';
import AppError from '../utils/AppError.js';
import { isOwnerOrAdmin } from '../middleware/auth.js';

const PET_FIELDS = 'name species photos status createdBy';

// POST /api/applications  (logged in user)
export async function createApplication(req, res) {
  const pet = await Pet.findById(req.body.pet);
  if (!pet || pet.reviewStatus !== 'approved') throw new AppError('Pet not found', 404);
  if (pet.status !== 'available') {
    throw new AppError(`${pet.name} is not open for applications right now`, 400);
  }
  if (pet.createdBy?.equals(req.user._id)) {
    throw new AppError('You cannot apply for a pet you listed', 400);
  }

  const application = await Application.create({ ...req.body, user: req.user._id });
  res.status(201).json({ application });
}

// GET /api/applications/mine  (logged in user) applications I sent
export async function getMyApplications(req, res) {
  const applications = await Application.find({ user: req.user._id })
    .populate('pet', PET_FIELDS)
    .sort({ createdAt: -1 });
  res.json({ applications });
}

// GET /api/applications/received  (logged in user) applications for pets I listed
export async function getReceivedApplications(req, res) {
  const myPetIds = await Pet.find({ createdBy: req.user._id }).distinct('_id');
  const applications = await Application.find({ pet: { $in: myPetIds } })
    .populate('pet', PET_FIELDS)
    .populate('user', 'name email')
    .sort({ createdAt: -1 });
  res.json({ applications });
}

// DELETE /api/applications/:id  (owner can withdraw while pending)
export async function withdrawApplication(req, res) {
  const application = await Application.findOne({ _id: req.params.id, user: req.user._id });
  if (!application) throw new AppError('Application not found', 404);
  if (application.status !== 'pending') {
    throw new AppError('Only pending applications can be withdrawn', 400);
  }
  await application.deleteOne();
  res.json({ message: 'Application withdrawn' });
}

// GET /api/applications?status=  (admin)
export async function getAllApplications(req, res) {
  const filter = {};
  if (['pending', 'approved', 'rejected'].includes(req.query.status)) {
    filter.status = req.query.status;
  }
  const applications = await Application.find(filter)
    .populate('pet', PET_FIELDS)
    .populate('user', 'name email')
    .sort({ createdAt: -1 });
  res.json({ applications });
}

// PATCH /api/applications/:id/status  (admin, or the person who listed the pet)
// Approving one application marks the pet adopted and rejects the other pending ones.
export async function updateApplicationStatus(req, res) {
  const { status, adminNote } = req.body;
  const application = await Application.findById(req.params.id).populate('pet', 'createdBy');
  if (!application) throw new AppError('Application not found', 404);
  if (!application.pet || !isOwnerOrAdmin(req.user, application.pet)) {
    throw new AppError('You can only review applications for your own pets', 403);
  }

  const petId = application.pet._id;
  application.status = status;
  application.adminNote = adminNote;
  await application.save();

  if (status === 'approved') {
    await Pet.findByIdAndUpdate(petId, { status: 'adopted' });
    await Application.updateMany(
      { pet: petId, _id: { $ne: application._id }, status: 'pending' },
      { status: 'rejected', adminNote: 'This pet found another home.' }
    );
  }

  await application.populate([
    { path: 'pet', select: PET_FIELDS },
    { path: 'user', select: 'name email' },
  ]);
  res.json({ application });
}
