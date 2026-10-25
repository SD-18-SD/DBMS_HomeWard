import Pet from '../models/Pet.js';
import User from '../models/User.js';
import Application from '../models/Application.js';
import { removeUploads } from '../middleware/upload.js';

// Deletes a pet and everything that points at it:
// its photo files, its applications, and favorites in every user.
export async function deletePetEverywhere(pet) {
  await Pet.deleteOne({ _id: pet._id });
  removeUploads(pet.photos);
  await Application.deleteMany({ pet: pet._id });
  await User.updateMany({ favorites: pet._id }, { $pull: { favorites: pet._id } });
}
