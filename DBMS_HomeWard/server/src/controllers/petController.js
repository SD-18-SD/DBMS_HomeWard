import Pet, { SPECIES, PET_STATUS, REVIEW_STATUS, MAX_PHOTOS } from '../models/Pet.js';
import AppError from '../utils/AppError.js';
import { isOwnerOrAdmin } from '../middleware/auth.js';
import { filesToPaths, mergePhotos, removeUploads } from '../middleware/upload.js';
import { deletePetEverywhere } from '../utils/cleanup.js';

// Escapes special characters so user text is safe inside a RegExp.
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Turns the flat form fields into the shape the Pet model wants.
function toPetData(body) {
  const { contactName, contactPhone, contactEmail, keepPhotos, ...rest } = body;
  return { ...rest, contact: { name: contactName, phone: contactPhone, email: contactEmail } };
}

// Builds the search filter shared by the public search and the admin list.
function buildFilter(query) {
  const { name, species, minAge, maxAge, status } = query;
  const filter = {};
  if (name) filter.name = { $regex: escapeRegex(String(name)), $options: 'i' };
  if (species && SPECIES.includes(species)) filter.species = species;
  if (status && PET_STATUS.includes(status)) filter.status = status;

  const age = {};
  if (minAge !== undefined && minAge !== '') age.$gte = Number(minAge);
  if (maxAge !== undefined && maxAge !== '') age.$lte = Number(maxAge);
  if (Object.keys(age).length) filter.age = age;
  return filter;
}

async function paginate(filter, query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 12));
  const [pets, total] = await Promise.all([
    Pet.find(filter)
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Pet.countDocuments(filter),
  ]);
  return { pets, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

// Removes contact details for visitors who are not logged in.
function publicPet(pet, user) {
  const data = pet.toJSON();
  if (!user) delete data.contact;
  return data;
}

// GET /api/pets?name=&species=&minAge=&maxAge=&status=&page=&limit=
// Public search: ONLY approved listings are ever returned here.
export async function getPets(req, res) {
  const filter = { ...buildFilter(req.query), reviewStatus: 'approved' };
  const result = await paginate(filter, req.query);
  result.pets = result.pets.map((p) => publicPet(p, null));
  res.json(result);
}

// GET /api/pets/manage?reviewStatus=  (admin) every listing, any review status
export async function getAllPetsForAdmin(req, res) {
  const filter = buildFilter(req.query);
  if (REVIEW_STATUS.includes(req.query.reviewStatus)) filter.reviewStatus = req.query.reviewStatus;
  res.json(await paginate(filter, { ...req.query, limit: req.query.limit || 100 }));
}

// GET /api/pets/mine  (logged in) listings I created, any review status
export async function getMyListings(req, res) {
  const pets = await Pet.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
  res.json({ pets });
}

// GET /api/pets/:id
// Approved pets are public. Others are visible only to the owner and admins.
export async function getPet(req, res) {
  const pet = await Pet.findById(req.params.id).populate('createdBy', 'name role');
  if (!pet) throw new AppError('Pet not found', 404);
  if (pet.reviewStatus !== 'approved' && !isOwnerOrAdmin(req.user, pet)) {
    throw new AppError('Pet not found', 404);
  }
  res.json({ pet: publicPet(pet, req.user) });
}

// POST /api/pets  (logged in, multipart with up to 5 "photos")
export async function createPet(req, res) {
  const isAdmin = req.user.role === 'admin';
  const pet = await Pet.create({
    ...toPetData(req.body),
    photos: filesToPaths(req.files),
    createdBy: req.user._id,
    // Admin listings go live at once. User listings wait for an admin.
    reviewStatus: isAdmin ? 'approved' : 'pending_review',
    reviewedAt: isAdmin ? new Date() : undefined,
  });
  res.status(201).json({ pet });
}

// PUT /api/pets/:id  (owner or admin)
export async function updatePet(req, res) {
  const pet = await Pet.findById(req.params.id);
  if (!pet) throw new AppError('Pet not found', 404);
  if (!isOwnerOrAdmin(req.user, pet)) throw new AppError('You can only edit your own listings', 403);

  const { photos, removed } = mergePhotos({
    current: pet.photos,
    keep: req.body.keepPhotos,
    added: filesToPaths(req.files),
    max: MAX_PHOTOS,
  });

  pet.set({ ...toPetData(req.body), photos });

  // When a regular user edits, the listing goes back to the review queue.
  if (req.user.role !== 'admin') {
    pet.reviewStatus = 'pending_review';
    pet.reviewNote = '';
  }
  await pet.save();
  removeUploads(removed); // delete files only after the save worked
  res.json({ pet });
}

// PATCH /api/pets/:id/review  (admin) approve, reject or request changes
export async function reviewPet(req, res) {
  const pet = await Pet.findById(req.params.id);
  if (!pet) throw new AppError('Pet not found', 404);

  pet.reviewStatus = req.body.reviewStatus;
  pet.reviewNote = req.body.reviewNote;
  pet.reviewedAt = new Date();
  await pet.save();
  res.json({ pet });
}

// DELETE /api/pets/:id  (owner or admin)
export async function deletePet(req, res) {
  const pet = await Pet.findById(req.params.id);
  if (!pet) throw new AppError('Pet not found', 404);
  if (!isOwnerOrAdmin(req.user, pet)) throw new AppError('You can only delete your own listings', 403);

  await deletePetEverywhere(pet);
  res.json({ message: 'Pet deleted' });
}
