import User from '../models/User.js';
import Pet from '../models/Pet.js';
import Application from '../models/Application.js';
import Campaign from '../models/Campaign.js';
import AppError from '../utils/AppError.js';
import { deletePetEverywhere } from '../utils/cleanup.js';

// GET /api/users/favorites  (logged in user)
// Only approved pets are shown, in case a saved pet was later taken down.
export async function getFavorites(req, res) {
  await req.user.populate({ path: 'favorites', match: { reviewStatus: 'approved' } });
  res.json({ favorites: req.user.favorites.filter(Boolean) });
}

// POST /api/users/favorites/:petId  (toggle: add if missing, remove if present)
export async function toggleFavorite(req, res) {
  const pet = await Pet.findById(req.params.petId);
  if (!pet) throw new AppError('Pet not found', 404);

  const already = req.user.favorites.some((id) => id.equals(pet._id));
  if (already) req.user.favorites.pull(pet._id);
  else req.user.favorites.push(pet._id);
  await req.user.save();

  res.json({ favorited: !already, favorites: req.user.favorites });
}

// GET /api/users  (admin)
export async function getUsers(_req, res) {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ users });
}

// PATCH /api/users/:id/role  (admin)
export async function updateUserRole(req, res) {
  if (req.params.id === req.user._id.toString()) {
    throw new AppError('You cannot change your own role', 400);
  }
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role: req.body.role },
    { returnDocument: 'after', runValidators: true } // return the updated user
  );
  if (!user) throw new AppError('User not found', 404);
  res.json({ user });
}

// DELETE /api/users/:id  (admin)
// Removes the user, their applications and their pet listings.
// Their campaigns are closed (not deleted) so donors keep their history.
export async function deleteUser(req, res) {
  if (req.params.id === req.user._id.toString()) {
    throw new AppError('You cannot delete your own account here', 400);
  }
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new AppError('User not found', 404);

  await Application.deleteMany({ user: user._id });
  const pets = await Pet.find({ createdBy: user._id });
  for (const pet of pets) await deletePetEverywhere(pet);
  await Campaign.updateMany({ createdBy: user._id }, { status: 'closed' });

  res.json({ message: 'User deleted' });
}
