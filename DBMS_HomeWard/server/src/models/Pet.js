import mongoose from 'mongoose';

export const SPECIES = ['dog', 'cat', 'rabbit', 'bird', 'other'];
// Adoption status: can someone still adopt this pet?
export const PET_STATUS = ['available', 'pending', 'adopted'];
// Moderation status: has an admin checked this listing?
export const REVIEW_STATUS = ['pending_review', 'approved', 'rejected', 'changes_requested'];
export const MAX_PHOTOS = 5;

// Contact details for the person or shelter that listed the pet.
// _id: false stops Mongoose from giving this small object its own id.
const contactSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
  },
  { _id: false }
);

const petSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    species: { type: String, required: true, enum: SPECIES },
    breed: { type: String, trim: true, default: 'Mixed' },
    age: { type: Number, required: true, min: 0, max: 30 }, // in years
    gender: { type: String, enum: ['male', 'female'], required: true },
    size: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    vaccinated: { type: Boolean, default: false },
    location: { type: String, trim: true, maxlength: 80, default: '' },
    contact: { type: contactSchema, default: () => ({}) },
    status: { type: String, enum: PET_STATUS, default: 'available' },

    // A list of public photo paths, for example ["/uploads/1712-buddy.jpg"]. The first one is the cover.
    photos: {
      type: [String],
      default: [],
      validate: [(list) => list.length <= MAX_PHOTOS, `A pet can have at most ${MAX_PHOTOS} photos`],
    },

    // Moderation. Admin listings start approved, user listings start pending_review.
    reviewStatus: { type: String, enum: REVIEW_STATUS, default: 'pending_review' },
    reviewNote: { type: String, trim: true, default: '' }, // admin feedback shown to the owner
    reviewedAt: { type: Date },

    // Who listed the pet. Used to check "is this my listing?"
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Indexes make searches faster.
petSchema.index({ name: 'text' });
petSchema.index({ reviewStatus: 1, species: 1, status: 1, age: 1 });
petSchema.index({ createdBy: 1 });

export default mongoose.model('Pet', petSchema);
